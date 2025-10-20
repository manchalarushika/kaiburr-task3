#  Task Executor Management System: Web UI Frontend (Task 3)

##  Project Overview

This document details the **Web UI Frontend** developed using **React 19** and **TypeScript**.  
This application serves as the **user interface** for the **Task Executor Management System**, enabling users to **securely manage and execute shell commands** through the corresponding **RESTful API**.

The entire UI is built using **Ant Design** components to ensure **high usability**, **accessibility**, and a **modern, responsive design** across all devices.

---

## Technology Stack

| Component | Technology | Description |
|------------|-------------|-------------|
| **Framework** | React 19, TypeScript | Utilized for a robust, maintainable, and type-safe component architecture. |
| **UI Library** | Ant Design (AntD) | Provided a comprehensive set of professional and accessible UI components (Tables, Modals, Forms). |
| **Styling** | Custom CSS / Tailwind (Implicit) | Ensured full responsiveness and an intuitive layout. |
| **Data Source** | Spring Boot API (Task 1) | Consumed REST endpoints on `http://localhost:8080` for all CRUD and execution requests. |

---

##  Web UI Forms and Core Features (Task 3)

The interface is structured around a **Task Management Dashboard** that provides full administrative control over stored commands.

###  Intuitive Dashboard
A single, responsive screen built using **Ant Design’s Table component** for seamless viewing of all tasks.

###  Complete Task Lifecycle (CRUD)
- **Create/Edit Forms:**  
  Uses accessible Ant Design **Modal** and **Form** components to capture and validate Task details (Name, Owner, Command).  
- **Search Functionality:**  
  Integrated search bar for quick, case-insensitive filtering of tasks by name.  
- **Secure Execution:**  
  A dedicated **Execute** button in the table row triggers the backend execution endpoint with one click.  
- **Execution History & Output Viewer:**  
  Implements a detailed **Modal view** to display execution history for any task.  
  Shows **start time**, **end time**, and captured **stdout/stderr** for post-execution review.

---

##  Frontend Setup

Follow these steps to run the Web UI locally.

> **Note:** The Spring Boot API (Task 1) must be running and accessible at `http://localhost:8080`.

###  Prerequisites
- Node.js  
- npm or Yarn  

###  Install Dependencies
Navigate to the frontend directory and install required packages:

```bash
cd [frontend-directory]
npm install
```
### Run Application
Start the Reack development server:
```bash
npm start
```
This application will typically open in your browser at:
http://localhost:5173/

#### Output

1)Task Creation/Edit form

<img width="1746" height="889" alt="image" src="https://github.com/user-attachments/assets/a679f7e5-0e01-4d8c-be3f-7b812ab2b50b" />

2)Task Management Dashboard(List and search)

<img width="1919" height="921" alt="image" src="https://github.com/user-attachments/assets/e8adf142-6b11-49cf-a115-3faa0ced119e" />

3)Command Execution and Output View

<img width="1752" height="887" alt="image" src="https://github.com/user-attachments/assets/fbe3b892-f7e9-4967-a538-12da1286f45e" />


