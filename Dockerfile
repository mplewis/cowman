FROM golang:1.26 AS build
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build .

FROM debian:bookworm-slim AS tzdata
RUN apt-get update && apt-get install -y --no-install-recommends tzdata ca-certificates && rm -rf /var/lib/apt/lists/*

FROM scratch
WORKDIR /app
COPY --from=tzdata /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=tzdata /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /app/cowman /app/cowman
CMD ["/app/cowman"]
