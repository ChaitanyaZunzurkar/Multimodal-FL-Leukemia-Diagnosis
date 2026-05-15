# 🏥 Federated Multimodal Leukemia Diagnosis System

A production-ready Clinical Decision Support System (CDSS) utilizing **Federated Learning**, **Dual-Input Multimodal Neural Networks** (Image + Tabular Data), and **Explainable AI (XAI)** for the secure and interpretable detection of acute leukemia.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.12-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.0+-black.svg)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.15+-orange.svg)
![Status](https://img.shields.io/badge/status-Flagship_Prototype-brightgreen.svg)

---

## 📑 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Key Enterprise Features](#2-key-enterprise-features)
3. [System Architecture](#3-system-architecture)
4. [Installation & Setup](#4-installation--setup)
5. [Usage Guide](#5-usage-guide)
6. [API Reference](#6-api-reference)
7. [Directory Structure](#7-directory-structure)
8. [Clinical Disclaimer](#8-clinical-disclaimer)

---

## 1. Project Overview

The **Federated Multimodal Leukemia Diagnosis System** represents a paradigm shift in automated hematological diagnostics. By combining decentralized Federated Learning (FL) with robust multimodal neural architectures, this system allows multiple medical institutions to collaboratively train highly accurate diagnostic models without ever sharing sensitive raw patient data. The integration of Explainable AI (XAI) ensures that all predictions are interpretable, building crucial trust with medical professionals.

---

## 2. Key Enterprise Features

### 🎯 Federated Learning & Privacy Preservation
- **Decentralized AI:** Employs a Federated Averaging (`FedAvg`) strategy to securely aggregate knowledge across institutional boundaries.
- **Dynamic Model Selection:** Seamlessly toggle between the **Global Aggregated Model** (99.2% accuracy) and local institutional models (Site Alpha / Site Beta).
- **Differential Privacy:** Defends against model inversion attacks using local gradient clipping and additive Gaussian noise.

### 🧠 Explainable AI (XAI) & Clinical Safety
- **Visual Interpretability (Grad-CAM):** Generates heatmaps over blood smear microscopy images, verifying the model focuses on pathological morphological anomalies rather than artifacts.
- **Tabular Feature Attribution:** Calculates partial derivatives to highlight the specific clinical blood counts (e.g., elevated WBC, depressed platelets) driving the diagnosis.
- **Uncertainty Quantification:** Utilizes Monte Carlo (MC) Dropout for multiple inference passes, computing prediction variance to flag Out-of-Distribution (OOD) data.

### 🧬 Multimodal Late-Fusion Architecture
- **Dual-Input Analysis:** Synthesizes 224x224 blood smear images (CNN branch) with 9 distinct clinical laboratory values (MLP branch) for holistic patient assessment.
- **Automated Data Processing:** Performs real-time image normalization, resizing, and tabular standard scaling via `joblib`.
- **One-Click Demo Profiles:** Includes pre-loaded clinical profiles (Healthy vs. Leukemia) for rapid system validation and demonstration.

---

## 3. System Architecture

The system follows a modern decoupled architecture, separating the high-performance Next.js frontend from the computationally intensive FastAPI/TensorFlow backend.

```text
Browser (localhost:3000)
         │ (FormData: Image + 9 Features + Model Choice)
         ▼
    Frontend (Next.js + React)
    ├── Dynamic Model Selector
    ├── Demo Data Autofill
    └── XAI Visualization Dashboard
         │ HTTP POST /predict
         ▼
    Backend (FastAPI - localhost:8000)
    ├── Image & Tabular Preprocessing
    └── Grad-CAM & Gradient Math Engine
         │
         ▼
    ML Model (TensorFlow/Keras)
    ├── Late-Fusion Multimodal Network
    └── Binary Focal Crossentropy (Handles Class Imbalance)
```

---

## 4. Installation & Setup

Get the system running locally in two quick steps.

### Step 1: Backend Initialization (FastAPI)
Open your first terminal and run the following commands to start the machine learning server:
```bash
cd backend 
python -m venv venv
# Windows: venv\Scripts\activate | macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
pip install opencv-python-headless scikit-learn  # Required for XAI and Scaler
python main.py
```
*The backend will be available at `http://localhost:8000`*

### Step 2: Frontend Initialization (Next.js)
Open a second terminal and execute:
```bash
cd frontend 
npm install
npm install lucide-react recharts axios react-hot-toast
npm run dev
```
*The frontend will be accessible at `http://localhost:3000`*

---

## 5. Usage Guide

1. **Access the Dashboard:** Navigate to [http://localhost:3000](http://localhost:3000).
2. **Select a Model:** Use the configuration panel to choose between the Global Model or specific Local Models.
3. **Input Data:** Manually input patient laboratory values and upload a blood smear image, or utilize the "Load Demo Data" buttons for quick testing.
4. **Analyze:** Click "Analyze" to run the multimodal inference.
5. **Review Results:** Examine the primary prediction, confidence score, Grad-CAM visual explanation, and tabular feature attributions.
6. **View Documentation:** Visit the `/documentation` route to view interactive charts detailing Federated Learning convergence and model comparisons.

---

## 6. API Reference

### Base URL: `http://localhost:8000`

#### **GET `/health`**
Verifies server health and ensures all required ML assets are loaded.
```json
{ 
  "status": "healthy", 
  "models_loaded": {
    "global": true, 
    "alpha": true, 
    "beta": true
  }, 
  "scaler_loaded": true 
}
```

#### **POST `/predict`**
Executes multimodal inference and generates XAI explanations.
- **Input (FormData):** 
  - `file`: Blood smear image (JPEG/PNG)
  - `WBC_count` ... `Uric_acid`: Clinical tabular features (Floats)
  - `model_type`: Target model identifier ("global", "alpha", "beta")
- **Output:**
```json
{
  "classification": "Leukemia",
  "confidence": 0.985,
  "model_used": "global",
  "explanation_image": "<base64_gradcam_string>",
  "feature_importance": {
    "WBC_count": 0.45, 
    "Platelet_count": -0.12
  }
}
```

---

## 7. Directory Structure

```text
leukemia-diagnosis/
├── backend/                    # FastAPI application & ML Inference
│   ├── main.py                 # Core server logic & XAI generators
│   └── requirements.txt        
├── frontend/                   # Next.js application
│   ├── app/page.tsx            # Main Diagnostic Dashboard
│   ├── app/documentation/      # Architecture & FL Results Page
│   └── tailwind.config.ts      
├── models/                     # Federated ML assets
│   ├── base models/            # Local Institutional Models
│   │   ├── local_model_alpha.keras
│   │   └── local_model_beta.keras
│   ├── global models/          # Aggregated Models
│   │   └── global_model.keras  
│   └── scaler/                 # Data Standardization
│       └── scaler_global.joblib 
└── README.md                   # Project Documentation
```

---

## 8. Clinical Disclaimer

⚠️ **IMPORTANT**

**This system is a Clinical Decision Support System (CDSS) prototype built exclusively for research and educational purposes under a Federated Learning framework.**

- It is **NOT** a substitute for professional medical diagnosis.
- Results should **NOT** be used for primary clinical decision-making.
- Always consult a qualified hematologist, oncologist, or certified medical professional for diagnosis and treatment.