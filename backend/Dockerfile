FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
# El proceso no necesita privilegios de root dentro del contenedor.
RUN useradd --system --no-create-home --uid 10001 paqrap
COPY --from=build /app/target/*.jar app.jar
USER paqrap
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
