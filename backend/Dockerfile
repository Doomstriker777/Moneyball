# syntax=docker/dockerfile:1

# ------------------------------------------------------------------------------
# Stage 1: Build Application with Maven and Temurin JDK 21
# ------------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Cache Maven dependencies by copying POM first
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build production JAR (skipping integration tests requiring local postgres)
COPY src ./src
RUN mvn clean package -DskipTests -B

# ------------------------------------------------------------------------------
# Stage 2: Minimal Production JRE Runtime
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine AS runner

# Create dedicated non-root application user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy executable jar from builder stage
COPY --from=builder --chown=appuser:appgroup /build/target/ledgerline-backend-*.jar app.jar

# Run as non-privileged user
USER appuser

# Healthcheck targeting Spring Boot Actuator
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=30s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

EXPOSE 8080

# Production JVM flags with container-aware memory tuning
ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

