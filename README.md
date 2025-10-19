Task Executor Management System: Kubernetes Deployment (Task 3)

Project Overview

This repository contains the complete full-stack application, which includes the Spring Boot Task Executor API and the React/TypeScript Frontend. This stage focuses on deploying the entire system securely and scalably onto a Kubernetes (K8s) Cluster.

The advanced requirement for this task is implemented by integrating the Java Backend with the Kubernetes Client Library (client-java) to execute commands inside dedicated, ephemeral Pods. This provides complete isolation and enhanced security over local shell execution.

Architecture Deployed to Kubernetes

The deployment utilizes declarative YAML manifests to manage the application and its persistence.

Component

Technology

K8s Resource

External Access

Database

MongoDB 6.0

Deployment, Service (ClusterIP), PVC

Internal Only (mongodb-service:27017)

Backend API

Spring Boot 3 / Java 21

Deployment, Service (NodePort)

NodePort 30080 (External)

Execution Engine

BusyBox

Pod (Ephemeral)

Managed via CoreV1Api

🚀 Deployment Instructions

Prerequisites

Kubernetes Cluster: A running cluster (e.g., Minikube, GKE, EKS).

kubectl: Configured to communicate with the cluster.

Docker Image: The Spring Boot application must be built into a Docker image (e.g., task-executor-app:latest) and accessible by the cluster nodes. (Refer to the Dockerfile for build details.)

YAML Manifests

The deployment relies on the following two primary manifests:

mongodb-deployment.yaml: Defines the MongoDB Deployment, its internal ClusterIP Service, and the PersistentVolumeClaim (PVC).

app-deployment.yaml: Defines the Task Executor API Deployment, including environment variables to connect to MongoDB, and the external NodePort Service.

Execution Steps

Deploy MongoDB:
Deploys the database with persistence and an internal ClusterIP for the API to connect to.

kubectl apply -f mongodb-deployment.yaml


Deploy Backend API:
Deploys the Java API, automatically connecting it to the database using the service name mongodb-service.

kubectl apply -f app-deployment.yaml


Verify Deployment:
Confirm that both the database and the API pods are running.

kubectl get pods
kubectl get svc


Accessing the API

The task-executor-service is exposed on every node in the cluster via NodePort 30080.

# Example for Minikube
minikube service task-executor-service --url

# General K8s access URL format
http://<NODE_IP>:30080/tasks


Advanced Requirement: Isolated Command Execution

The core feature of this task is shifting command execution from the local shell of the API server to a dedicated, throwaway Kubernetes Pod.

Implementation Details

Component/Feature

Implementation Detail

K8s Client

Uses the io.kubernetes:client-java dependency (as seen in pom.xml).

Execution Flow

The TaskServiceImpl.executeTask(id) method no longer uses Runtime.getRuntime().exec(). Instead, it calls CoreV1Api.createNamespacedPod().

Pod Configuration

A new ephemeral Pod is created using the busybox image. The command from the Task is passed directly to this Pod's container using the command and args fields in the Pod specification.

Cleanup

After the Pod status reaches Succeeded or Failed, the Pod's logs are retrieved, and the Pod is immediately deleted via k8sApi.deleteNamespacedPod().

Security

This design inherently prevents Command Injection on the API server's host OS, as the command is executed in an isolated, non-privileged container environment.
