"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const inference_1 = require("@huggingface/inference");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const API_KEY = process.env.HUGGING_FACE_API_KEY;
const MODEL = process.env.HUGGING_FACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";
function verifyKey() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Verifying Hugging Face Key...`);
        console.log(`Model: ${MODEL}`);
        if (!API_KEY) {
            console.error("❌ Error: HUGGING_FACE_API_KEY is missing in .env");
            return;
        }
        const hf = new inference_1.HfInference(API_KEY);
        try {
            const response = yield hf.textGeneration({
                model: "facebook/opt-125m",
                inputs: "Hello",
            });
            const reply = response.generated_text;
            console.log("✅ Success! API Key is valid (tested with facebook/opt-125m).");
            console.log("Response:", reply);
        }
        catch (error) {
            console.error("❌ Verification Failed:", error.message);
            if (error.response) {
                console.error("Status:", error.response.status);
            }
        }
    });
}
verifyKey();
