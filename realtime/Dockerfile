FROM rust:1-slim AS build
WORKDIR /build
ARG BUILD_SHA=dev
COPY realtime/Cargo.toml realtime/Cargo.lock* ./
RUN mkdir -p src && printf 'fn main() {}\n' > src/main.rs && cargo build --release
COPY realtime/src ./src
RUN BUILD_SHA=$BUILD_SHA cargo build --release

FROM rust:1-slim AS runtime
RUN useradd --system --uid 10001 pitlane
COPY --from=build /build/target/release/pocket-pitlane-realtime /usr/local/bin/pocket-pitlane-realtime
USER pitlane
EXPOSE 8080
ENV PORT=8080
CMD ["/usr/local/bin/pocket-pitlane-realtime"]
