# Veritas
# 🛡️ VERITAS: The Truth Protocol
### Decentralized, Offline-First Misinformation Detection for the Edge

![Version](https://img.shields.io/badge/version-0.1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Status](https://img.shields.io/badge/status-Research%20Prototype-orange)

> **"Truth should not depend on your internet connection."**

## 🌍 The Problem
In high-latency environments, traditional cloud-based fact-checking fails. 
*   **Latency:** API calls take 1000ms+ on 3G networks.
*   **Privacy:** Users are hesitant to send browsing data to centralized servers.
*   **Access:** 450M+ Indians lack consistent high-speed internet to verify news.

## 💡 The Solution: Edge AI
**Veritas** moves the intelligence from the Cloud to the Client. 
By compressing a **DistilBERT Transformer model** using Dynamic Quantization and ONNX Runtime, we achieve server-grade accuracy locally within the browser.

| Metric | Standard Cloud AI | Veritas (Edge Optimized) |
| :--- | :--- | :--- |
| **Model Size** | ~400 MB | **64.45 MB** (Quantized) |
| **Data Privacy** | Low (Data sent to server) | **100% Private** (Zero Egress) |
| **Latency** | 500ms - 2000ms | **~23ms** (CPU Inference) |
| **Offline Capable** | No | **Yes** |

---

## 🔬 Research & Architecture
This project is based on my original research: **"Democratizing Truth: Optimizing Transformer Models for Client-Side Misinformation Detection."**

### Core Technology Stack:
*   **Model:** DistilBERT (Fine-tuned on LIAR dataset)
*   **Optimization:** Dynamic Int8 Quantization via `optimum`
*   **Runtime:** ONNX (Open Neural Network Exchange)
*   **Interface:** `Transformers.js` (In-browser inference)

> 📄 **[Read the Full Research Paper](https://doi.org/10.5281/zenodo.17879430)**

---

## ⚠️ Current Implementation Status
**Current Version: v0.1 (Architecture Validation)**

I am currently in the process of migrating the inference engine from the Python research environment to the JavaScript production extension.

*   ✅ **Research Phase:** Model quantization and latency testing complete. (See Paper)
*   ✅ **Extension Shell:** UI and Event Listeners deployed.
*   🔄 **Integration Phase:** Currently integrating `transformers.js` to replace the heuristic fallback engine with the quantized ONNX model.
    *   *Note: The current `main` branch uses a simulation/heuristic engine for UI testing while the ONNX model is being wired up.*

---

## 🛠️ Installation (Developer Preview)

Since Veritas is designed for privacy, I support local "sideloading":

1.  Download the latest source code from **Releases**.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Toggle **Developer Mode** (top right).
4.  Click **Load Unpacked**.
5.  Select the `veritas-extension` folder.

## 🔮 Roadmap
*   **Phase 1:** Complete full integration of `model_quantized.onnx`.
*   **Phase 2:** Add "Credibility Scoring" visualizer.
*   **Phase 3:** Pilot deployment and launch.

## 👩‍💻 About the Author
Built by **Shambhavi Singh** (17).
*   **Mission:** Building "Civic Tech" for the next billion users.
*   **Contact:** shalinibhavi525@gmail.com

---
*Built with ❤️ and limited bandwidth in the jungle.* 🐒
