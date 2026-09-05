use axum::{
    body::Body,
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, ConnectInfo, State},
    http::{header, HeaderMap, HeaderValue, Request, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use futures_util::{SinkExt, StreamExt};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    env,
    net::SocketAddr,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio::sync::{broadcast, mpsc};
use uuid::Uuid;

const ROOM_TTL_SECONDS: i64 = 4 * 60 * 60;
const CONNECTION_LIMIT: u32 = 20;
const CONNECTION_WINDOW_SECONDS: i64 = 60;
const COLORS: [&str; 8] = ["#ff795f", "#65c9e8", "#d9f36c", "#ffc95e", "#cf9dff", "#ff94c7", "#70e1ba", "#f3f1e9"];

#[derive(Clone)]
struct AppState {
    database: Arc<Database>,
    rooms: Arc<Mutex<HashMap<String, broadcast::Sender<ServerMessage>>>>,
    limits: Arc<Mutex<HashMap<String, RateWindow>>>,
    build_sha: String,
}

#[derive(Debug, Clone)]
struct RateWindow {
    opened_at: i64,
    count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Driver {
    id: String,
    label: String,
    color: String,
    ready: bool,
    #[serde(default)]
    host: bool,
}

#[derive(Debug, Clone)]
struct Room {
    code: String,
    host_id: String,
    players: Vec<Driver>,
    seed: u64,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case", rename_all_fields = "camelCase")]
enum ClientMessage {
    Host { player_id: String },
    Join { room: String, player_id: String },
    Ready { ready: bool },
    Start,
    Input { steer: f32, throttle: bool, boost: bool },
    Ping,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "kebab-case", rename_all_fields = "camelCase")]
enum ServerMessage {
    Room { room: String, players: Vec<Driver> },
    Joined { room: String, player_id: String },
    RaceStart { players: Vec<Driver>, seed: u64 },
    Input { player_id: String, steer: f32, throttle: bool, boost: bool },
    Pong,
    Error { error: String },
}

#[derive(Debug)]
enum RoomError {
    Missing,
    Full,
    NotHost,
    NeedTwoReady,
    Invalid,
    Database,
}

impl RoomError {
    fn message(&self) -> String {
        match self {
            Self::Missing => "This room no longer exists. Check the code on the shared screen.".to_owned(),
            Self::Full => "This room already has eight controllers.".to_owned(),
            Self::NotHost => "Only the shared-screen host can start the race.".to_owned(),
            Self::NeedTwoReady => "Two ready drivers are needed before the race starts.".to_owned(),
            Self::Invalid => "That room request was not valid. Try again.".to_owned(),
            Self::Database => "The room service could not save this change. Try again.".to_owned(),
        }
    }
}

struct Database {
    connection: Mutex<Connection>,
}

impl Database {
    fn open(path: &Path) -> Result<Self, RoomError> {
        if let Some(parent) = path.parent().filter(|parent| !parent.as_os_str().is_empty()) {
            std::fs::create_dir_all(parent).map_err(|_| RoomError::Database)?;
        }
        let connection = Connection::open(path).map_err(|_| RoomError::Database)?;
        connection.execute_batch(
            "PRAGMA journal_mode=DELETE;
             PRAGMA busy_timeout=5000;
             CREATE TABLE IF NOT EXISTS rooms (
                code TEXT PRIMARY KEY,
                host_id TEXT NOT NULL,
                players_json TEXT NOT NULL,
                seed INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
             );
             CREATE INDEX IF NOT EXISTS rooms_host ON rooms(host_id);",
        ).map_err(|_| RoomError::Database)?;
        Ok(Self { connection: Mutex::new(connection) })
    }

    fn host_room(&self, host_id: &str) -> Result<Room, RoomError> {
        if !is_uuid(host_id) { return Err(RoomError::Invalid); }
        self.cleanup()?;
        if let Some(room) = self.load_by_host(host_id)? { return Ok(room); }
        let code = self.new_code()?;
        let timestamp = now();
        let room = Room {
            code: code.clone(),
            host_id: host_id.to_owned(),
            players: vec![Driver { id: host_id.to_owned(), label: "Host".to_owned(), color: COLORS[0].to_owned(), ready: true, host: true }],
            seed: random_seed(),
            created_at: timestamp,
            updated_at: timestamp,
        };
        self.save(&room)?;
        Ok(room)
    }

    fn join_room(&self, code: &str, player_id: &str) -> Result<Room, RoomError> {
        if !is_room_code(code) || !is_uuid(player_id) { return Err(RoomError::Invalid); }
        self.cleanup()?;
        let mut room = self.load(code)?.ok_or(RoomError::Missing)?;
        if !room.players.iter().any(|player| player.id == player_id) {
            if room.players.len() >= 8 { return Err(RoomError::Full); }
            let ordinal = room.players.len() + 1;
            room.players.push(Driver {
                id: player_id.to_owned(),
                label: format!("Driver {ordinal}"),
                color: COLORS[(ordinal - 1) % COLORS.len()].to_owned(),
                ready: false,
                host: false,
            });
        }
        room.updated_at = now();
        self.save(&room)?;
        Ok(room)
    }

    fn set_ready(&self, code: &str, player_id: &str, ready: bool) -> Result<Room, RoomError> {
        let mut room = self.load(code)?.ok_or(RoomError::Missing)?;
        let player = room.players.iter_mut().find(|player| player.id == player_id).ok_or(RoomError::Invalid)?;
        player.ready = ready;
        room.updated_at = now();
        self.save(&room)?;
        Ok(room)
    }

    fn start(&self, code: &str, player_id: &str) -> Result<Room, RoomError> {
        let mut room = self.load(code)?.ok_or(RoomError::Missing)?;
        if room.host_id != player_id { return Err(RoomError::NotHost); }
        if room.players.iter().filter(|player| player.ready).count() < 2 { return Err(RoomError::NeedTwoReady); }
        room.seed = random_seed();
        room.updated_at = now();
        self.save(&room)?;
        Ok(room)
    }

    fn load(&self, code: &str) -> Result<Option<Room>, RoomError> {
        let connection = self.connection.lock().map_err(|_| RoomError::Database)?;
        let row = connection.query_row(
            "SELECT code, host_id, players_json, seed, created_at, updated_at FROM rooms WHERE code = ?1",
            [code],
            |row| {
                let players_json: String = row.get(2)?;
                let players = serde_json::from_str(&players_json).map_err(|error| rusqlite::Error::FromSqlConversionFailure(2, rusqlite::types::Type::Text, Box::new(error)))?;
                Ok(Room { code: row.get(0)?, host_id: row.get(1)?, players, seed: row.get(3)?, created_at: row.get(4)?, updated_at: row.get(5)? })
            },
        ).optional().map_err(|_| RoomError::Database)?;
        Ok(row)
    }

    fn load_by_host(&self, host_id: &str) -> Result<Option<Room>, RoomError> {
        let connection = self.connection.lock().map_err(|_| RoomError::Database)?;
        let row = connection.query_row(
            "SELECT code, host_id, players_json, seed, created_at, updated_at FROM rooms WHERE host_id = ?1 ORDER BY updated_at DESC LIMIT 1",
            [host_id],
            |row| {
                let players_json: String = row.get(2)?;
                let players = serde_json::from_str(&players_json).map_err(|error| rusqlite::Error::FromSqlConversionFailure(2, rusqlite::types::Type::Text, Box::new(error)))?;
                Ok(Room { code: row.get(0)?, host_id: row.get(1)?, players, seed: row.get(3)?, created_at: row.get(4)?, updated_at: row.get(5)? })
            },
        ).optional().map_err(|_| RoomError::Database)?;
        Ok(row)
    }

    fn save(&self, room: &Room) -> Result<(), RoomError> {
        let players = serde_json::to_string(&room.players).map_err(|_| RoomError::Database)?;
        let connection = self.connection.lock().map_err(|_| RoomError::Database)?;
        connection.execute(
            "INSERT INTO rooms (code, host_id, players_json, seed, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(code) DO UPDATE SET host_id = excluded.host_id, players_json = excluded.players_json, seed = excluded.seed, updated_at = excluded.updated_at",
            params![room.code, room.host_id, players, room.seed, room.created_at, room.updated_at],
        ).map_err(|_| RoomError::Database)?;
        Ok(())
    }

    fn cleanup(&self) -> Result<(), RoomError> {
        let connection = self.connection.lock().map_err(|_| RoomError::Database)?;
        connection.execute("DELETE FROM rooms WHERE updated_at < ?1", [now() - ROOM_TTL_SECONDS]).map_err(|_| RoomError::Database)?;
        Ok(())
    }

    fn new_code(&self) -> Result<String, RoomError> {
        for _ in 0..20 {
            let code = make_code();
            if self.load(&code)?.is_none() { return Ok(code); }
        }
        Err(RoomError::Database)
    }
}

fn now() -> i64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or(Duration::ZERO).as_secs() as i64 }
fn random_seed() -> u64 {
    let bytes = Uuid::new_v4().into_bytes();
    u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]) as u64
}
fn is_uuid(value: &str) -> bool { Uuid::parse_str(value).is_ok() }
fn is_room_code(value: &str) -> bool { value.len() == 6 && value.chars().all(|character| character.is_ascii_uppercase() || character.is_ascii_digit()) }
fn make_code() -> String {
    const LETTERS: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let bytes = Uuid::new_v4().as_bytes().to_owned();
    (0..6).map(|index| LETTERS[(bytes[index] as usize) % LETTERS.len()] as char).collect()
}

fn app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/ws", get(ws_handler).route_layer(middleware::from_fn_with_state(state.clone(), ws_guard)))
        .with_state(state)
}

async fn health(State(state): State<AppState>) -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok", "build": state.build_sha }))
}

async fn ws_handler(
    websocket: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    websocket.on_upgrade(move |socket| socket_session(socket, state)).into_response()
}

async fn ws_guard(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    request: Request<Body>,
    next: Next,
) -> Response {
    if !allowed_origin(&headers) { return (StatusCode::FORBIDDEN, "This origin cannot open a room controller.").into_response(); }
    let client = forwarded_for(&headers).unwrap_or_else(|| peer.ip().to_string());
    if !allow_connection(&state, &client) {
        let mut response = (StatusCode::TOO_MANY_REQUESTS, "Too many connection attempts. Wait a minute and try again.").into_response();
        response.headers_mut().insert(header::RETRY_AFTER, HeaderValue::from_static("60"));
        return response;
    }
    next.run(request).await
}

fn allowed_origin(headers: &HeaderMap) -> bool {
    let Some(origin) = headers.get(header::ORIGIN).and_then(|value| value.to_str().ok()) else { return true; };
    origin == "https://pocket-pitlane.sociobot.in" || origin == "http://127.0.0.1:4173" || origin == "http://localhost:4173"
}

fn forwarded_for(headers: &HeaderMap) -> Option<String> {
    headers.get("x-forwarded-for").and_then(|value| value.to_str().ok()).and_then(|value| value.split(',').next()).map(|value| value.trim().to_owned()).filter(|value| !value.is_empty())
}

fn allow_connection(state: &AppState, client: &str) -> bool {
    let timestamp = now();
    let Ok(mut limits) = state.limits.lock() else { return false; };
    let window = limits.entry(client.to_owned()).or_insert(RateWindow { opened_at: timestamp, count: 0 });
    if timestamp - window.opened_at >= CONNECTION_WINDOW_SECONDS { *window = RateWindow { opened_at: timestamp, count: 0 }; }
    if window.count >= CONNECTION_LIMIT { return false; }
    window.count += 1;
    true
}

async fn socket_session(socket: WebSocket, state: AppState) {
    let (mut writer, mut reader) = socket.split();
    let (outgoing, mut outgoing_rx) = mpsc::unbounded_channel::<ServerMessage>();
    let write_task = tokio::spawn(async move {
        while let Some(message) = outgoing_rx.recv().await {
            let Ok(json) = serde_json::to_string(&message) else { continue; };
            if writer.send(Message::Text(json.into())).await.is_err() { break; }
        }
    });
    let mut room_code: Option<String> = None;
    let mut player_id: Option<String> = None;
    while let Some(result) = reader.next().await {
        let Ok(message) = result else { break; };
        let Message::Text(text) = message else { continue; };
        let Ok(command) = serde_json::from_str::<ClientMessage>(&text) else {
            let _ = outgoing.send(ServerMessage::Error { error: "That controller message was not valid. Rejoin the room.".to_owned() });
            continue;
        };
        match handle_command(command, &state, &outgoing, &mut room_code, &mut player_id).await {
            Ok(()) => (),
            Err(error) => { let _ = outgoing.send(ServerMessage::Error { error: error.message() }); }
        }
    }
    drop(outgoing);
    write_task.abort();
}

async fn handle_command(
    command: ClientMessage,
    state: &AppState,
    outgoing: &mpsc::UnboundedSender<ServerMessage>,
    room_code: &mut Option<String>,
    player_id: &mut Option<String>,
) -> Result<(), RoomError> {
    match command {
        ClientMessage::Host { player_id: next_id } => {
            if room_code.is_some() { return Err(RoomError::Invalid); }
            let room = state.database.host_room(&next_id)?;
            *room_code = Some(room.code.clone());
            *player_id = Some(next_id);
            subscribe(&room.code, state, outgoing.clone());
            let _ = outgoing.send(room_message(&room));
        }
        ClientMessage::Join { room, player_id: next_id } => {
            if room_code.is_some() { return Err(RoomError::Invalid); }
            let room = state.database.join_room(&room, &next_id)?;
            *room_code = Some(room.code.clone());
            *player_id = Some(next_id.clone());
            subscribe(&room.code, state, outgoing.clone());
            let _ = outgoing.send(ServerMessage::Joined { room: room.code.clone(), player_id: next_id });
            broadcast_room(&room, state);
        }
        ClientMessage::Ready { ready } => {
            let (room, player) = session(room_code, player_id)?;
            let updated = state.database.set_ready(room, player, ready)?;
            broadcast_room(&updated, state);
        }
        ClientMessage::Start => {
            let (room, player) = session(room_code, player_id)?;
            let updated = state.database.start(room, player)?;
            send_room_event(&updated.code, state, ServerMessage::RaceStart { players: updated.players.clone(), seed: updated.seed });
        }
        ClientMessage::Input { steer, throttle, boost } => {
            let (room, player) = session(room_code, player_id)?;
            if !steer.is_finite() { return Err(RoomError::Invalid); }
            send_room_event(room, state, ServerMessage::Input { player_id: player.to_owned(), steer: steer.clamp(-1.0, 1.0), throttle, boost });
        }
        ClientMessage::Ping => { let _ = outgoing.send(ServerMessage::Pong); }
    }
    Ok(())
}

fn session<'a>(room_code: &'a Option<String>, player_id: &'a Option<String>) -> Result<(&'a str, &'a str), RoomError> {
    match (room_code.as_deref(), player_id.as_deref()) { (Some(room), Some(player)) => Ok((room, player)), _ => Err(RoomError::Invalid) }
}

fn room_message(room: &Room) -> ServerMessage { ServerMessage::Room { room: room.code.clone(), players: room.players.clone() } }

fn channel(code: &str, state: &AppState) -> broadcast::Sender<ServerMessage> {
    let mut channels = state.rooms.lock().expect("room channels lock");
    channels.entry(code.to_owned()).or_insert_with(|| broadcast::channel(32).0).clone()
}

fn subscribe(code: &str, state: &AppState, outgoing: mpsc::UnboundedSender<ServerMessage>) {
    let mut receiver = channel(code, state).subscribe();
    tokio::spawn(async move { while let Ok(message) = receiver.recv().await { if outgoing.send(message).is_err() { break; } } });
}

fn send_room_event(code: &str, state: &AppState, message: ServerMessage) { let _ = channel(code, state).send(message); }
fn broadcast_room(room: &Room, state: &AppState) { send_room_event(&room.code, state, room_message(room)); }

#[tokio::main]
async fn main() {
    let port = env::var("PORT").ok().and_then(|value| value.parse::<u16>().ok()).unwrap_or(8080);
    let database_path = if Path::new("/data").is_dir() { PathBuf::from("/data/pocket-pitlane.sqlite") } else { PathBuf::from("pocket-pitlane.sqlite") };
    let build_sha = option_env!("BUILD_SHA").unwrap_or("dev").to_owned();
    let database = Database::open(&database_path).expect("open SQLite room database");
    let state = AppState { database: Arc::new(database), rooms: Arc::new(Mutex::new(HashMap::new())), limits: Arc::new(Mutex::new(HashMap::new())), build_sha: build_sha.clone() };
    let address = SocketAddr::from(([0, 0, 0, 0], port));
    println!("{{\"event\":\"startup\",\"port\":{port},\"database\":\"{}\",\"build\":\"{build_sha}\"}}", database_path.display());
    let listener = tokio::net::TcpListener::bind(address).await.expect("bind realtime server");
    axum::serve(listener, app(state).into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("serve realtime server");
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}

#[cfg(test)]
mod tests {
    use super::*;
    use tower::ServiceExt;

    fn temporary_database() -> (Database, PathBuf) {
        let path = env::temp_dir().join(format!("pitlane-test-{}.sqlite", Uuid::new_v4()));
        (Database::open(&path).expect("temporary database"), path)
    }

    fn state(database: Database) -> AppState {
        AppState { database: Arc::new(database), rooms: Arc::new(Mutex::new(HashMap::new())), limits: Arc::new(Mutex::new(HashMap::new())), build_sha: "test-build".to_owned() }
    }

    #[test]
    fn claim_realtime_persists_after_restart() {
        let (database, path) = temporary_database();
        let host_id = Uuid::new_v4().to_string();
        let driver_id = Uuid::new_v4().to_string();
        let room = database.host_room(&host_id).expect("host room");
        let joined = database.join_room(&room.code, &driver_id).expect("join room");
        database.set_ready(&room.code, &driver_id, true).expect("ready");
        drop(database);
        let restarted = Database::open(&path).expect("reopen database");
        let restored = restarted.load(&room.code).expect("load room").expect("room exists");
        assert_eq!(restored.players.len(), 2);
        assert!(restored.players.iter().any(|player| player.id == driver_id && player.ready));
        assert_eq!(joined.code, restored.code);
        let _ = std::fs::remove_file(path);
    }

    #[tokio::test]
    async fn claim_realtime_rate_limit_returns_retry_after() {
        let (database, path) = temporary_database();
        let application = app(state(database));
        let health = application.clone().oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(health.status(), StatusCode::OK);
        for _ in 0..CONNECTION_LIMIT {
            let request = Request::builder().uri("/ws").header(header::ORIGIN, "http://127.0.0.1:4173").header(header::CONNECTION, "upgrade").header(header::UPGRADE, "websocket").header("sec-websocket-version", "13").header("sec-websocket-key", "dGhlIHNhbXBsZSBub25jZQ==").extension(ConnectInfo(SocketAddr::from(([127, 0, 0, 1], 4100)))).body(Body::empty()).unwrap();
            let response = application.clone().oneshot(request).await.unwrap();
            assert_ne!(response.status(), StatusCode::TOO_MANY_REQUESTS);
        }
        let request = Request::builder().uri("/ws").header(header::ORIGIN, "http://127.0.0.1:4173").header(header::CONNECTION, "upgrade").header(header::UPGRADE, "websocket").header("sec-websocket-version", "13").header("sec-websocket-key", "dGhlIHNhbXBsZSBub25jZQ==").extension(ConnectInfo(SocketAddr::from(([127, 0, 0, 1], 4100)))).body(Body::empty()).unwrap();
        let response = application.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(response.headers().get(header::RETRY_AFTER).unwrap(), "60");
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn claim_room_limit_allows_eight_drivers() {
        let (database, path) = temporary_database();
        let host_id = Uuid::new_v4().to_string();
        let room = database.host_room(&host_id).expect("host room");
        for _ in 0..7 {
            database.join_room(&room.code, &Uuid::new_v4().to_string()).expect("join through eighth driver");
        }
        let ninth = database.join_room(&room.code, &Uuid::new_v4().to_string());
        assert!(matches!(ninth, Err(RoomError::Full)));
        let _ = std::fs::remove_file(path);
    }
}
