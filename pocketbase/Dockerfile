FROM alpine:latest

# Install ca-certificates for SSL
RUN apk --no-cache add ca-certificates

WORKDIR /pb/

# Copy PocketBase executable (assuming we have a Linux version)
COPY pocketbase /pb/pocketbase

# Copy migrations and data
COPY pb_migrations/ /pb/pb_migrations/
COPY pb_data/ /pb/pb_data/

# Make the binary executable
RUN chmod +x /pb/pocketbase

# Expose the default PocketBase port
EXPOSE 8090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1

# Start PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]