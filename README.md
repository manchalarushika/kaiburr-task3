#  Task Executor Management System: Kubernetes Deployment (Task 3)

##  Project Overview

This repository contains the **complete full-stack Task Executor Management System**, featuring:

- **Backend:** Spring Boot 3 / Java 21  
- **Frontend:** React / TypeScript  
- **Database:** MongoDB 6.0  
- **Deployment Environment:** Kubernetes (K8s)

This phase focuses on **secure and scalable deployment** of the entire system onto a **Kubernetes Cluster**, ensuring high availability, modularity, and security.

An advanced implementation integrates the **Java Backend** with the **Kubernetes Client Library (`client-java`)**, enabling **ephemeral Pod-based command execution** — providing complete isolation and enhanced security compared to traditional local shell execution.

---

##  Architecture Deployed to Kubernetes

| Component         | Technology              | K8s Resource                              | External Access                  |
|-------------------|--------------------------|--------------------------------------------|----------------------------------|
| **Database**      | MongoDB 6.0              | Deployment, Service (ClusterIP), PVC       | Internal Only (`mongodb-service:27017`) |
| **Backend API**   | Spring Boot 3 / Java 21  | Deployment, Service (NodePort)             | NodePort **30080** (External)    |
| **Execution Engine** | BusyBox               | Ephemeral Pod (Managed via CoreV1Api)      | Internal (API-triggered)         |

---

##  Deployment Instructions

###  Prerequisites

- **Kubernetes Cluster** — (e.g., Minikube, GKE, or EKS)
- **kubectl** — configured to communicate with the cluster
- **Docker Image** — build and push the Spring Boot app image (e.g., `task-executor-app:latest`)  
  *(Refer to the `Dockerfile` for build instructions.)*

---

##  YAML Manifests

The deployment uses two primary manifests:

1. **`mongodb-deployment.yaml`**  
   - Defines MongoDB Deployment  
   - Includes ClusterIP Service and PersistentVolumeClaim (PVC)

2. **`app-deployment.yaml`**  
   - Defines the Spring Boot Task Executor API Deployment  
   - Includes environment variables for MongoDB connection  
   - Exposes the service via NodePort **30080**

---

##  Execution Steps

###  Deploy MongoDB
```bash
kubectl apply -f mongodb-deployment.yaml
```
Deploys the MongoDB database with persistence and internal ClusterIP service.
### Deploy Backend API 
```bash
kubectl apply -f app-deployment.yaml
```
Deploys the Task Executor API connected to MongoDB using the service name mongodb-service.
### Verify Deployment
```bash
kubectl get pods
kubectl get svc
```
Ensure both database and API pods are running successfully.

#### Accessing the API
The API is exposed via NodePort 30080 across all cluster nodes.
### Example for Minikube:
```base
minikube service task-executor-service --url

```
### General Access Format:
```base
http://<NODE_IP>:30080/tasks
```
#### Advanced Feature: Isolated Command Execution
The core enhancement in this task is isolated command execution within ephemeral Kubernetes Pods, providing a secure alternative to executing shell commands on the host system
### Implementation Details
Component / Feature	Description
K8s Client	Uses io.kubernetes:client-java dependency (refer to pom.xml)
Execution Flow	TaskServiceImpl.executeTask(id) creates an ephemeral Pod using CoreV1Api.createNamespacedPod()
Pod Configuration	Uses busybox image — executes the provided command in the container via command and args fields
Cleanup Process	After Pod reaches Succeeded or Failed, logs are retrieved and Pod is deleted using deleteNamespacedPod()
Security Advantage	Prevents command injection and ensures tasks run in isolated, non-privileged environments

### Key Technologies Used

-Java 21 / Spring Boot 3

-MongoDB 6.0

-React + TypeScript



Kubernetes

Kubernetes Java Client (client-java)






