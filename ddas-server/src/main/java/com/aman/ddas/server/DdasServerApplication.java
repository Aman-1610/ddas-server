package com.aman.ddas.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class DdasServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(DdasServerApplication.class, args);
	}

}
