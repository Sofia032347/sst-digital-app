package com.sst.sst;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories(basePackages = "com.sst.sst.repository")
@EntityScan(basePackages = "com.sst.sst.model")
public class SstApplication {
    public static void main(String[] args) {
        SpringApplication.run(SstApplication.class, args);
    }
}