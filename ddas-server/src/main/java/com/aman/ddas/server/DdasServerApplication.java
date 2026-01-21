package com.aman.ddas.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class DdasServerApplication {

	public static void main(String[] args) {

		String envUrl = System.getenv("SPRING_DATASOURCE_URL");
		if (envUrl == null || envUrl.isEmpty()) {
			envUrl = System.getenv("DATABASE_URL");
		}
		if (envUrl != null && (envUrl.startsWith("postgres://") || envUrl.startsWith("postgresql://"))) {
			try {
				java.net.URI dbUri = new java.net.URI(envUrl);
				String username = "";
				String password = "";
				if (dbUri.getUserInfo() != null) {
					String[] userInfo = dbUri.getUserInfo().split(":", 2);
					username = userInfo[0];
					if (userInfo.length > 1) {
						password = userInfo[1];
					}
				}
				int port = dbUri.getPort();
				if (port == -1) {
					port = 5432;
				}
				String jdbcUrl = "jdbc:postgresql://" + dbUri.getHost() + ":" + port + dbUri.getPath();
				System.setProperty("spring.datasource.url", jdbcUrl);
				System.setProperty("spring.datasource.username", username);
				System.setProperty("spring.datasource.password", password);
				System.out.println(
						"Converted " + dbUri.getScheme() + ":// URL to jdbc:postgresql:// format for Spring Boot");
			} catch (Exception e) {
				System.err.println("Failed to parse SPRING_DATASOURCE_URL: " + e.getMessage());
			}
		}

		SpringApplication.run(DdasServerApplication.class, args);
	}

}
