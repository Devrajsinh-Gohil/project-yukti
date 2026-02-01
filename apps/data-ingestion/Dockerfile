# Build Stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server/main.go

# Runtime Stage
FROM alpine:latest

WORKDIR /app

# Install certificates for HTTPS (if needed)
RUN apk --no-cache add ca-certificates

# Copy binary from builder
COPY --from=builder /app/server .

# Expose port (if applicable, server runs on 8080 or listens to redis? Assuming no public port needed unless specified, but user mentioned default logic)
# Based on main.go path, it's a server. Checking context, it might be a background worker or API.
# Will expose 8080 as a safe default for Go servers, or check main.go.

CMD ["./server"]
