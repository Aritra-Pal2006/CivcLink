"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
function testAi() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Testing AI Endpoint...");
            const response = yield axios_1.default.post('http://localhost:5000/api/ai/classify', {
                title: "Test Complaint",
                description: "This is a test description for the AI."
            }, {
                validateStatus: () => true // Don't throw on error status
            });
            console.log("Status:", response.status);
            console.log("Data:", response.data);
        }
        catch (error) {
            console.error("Request Failed:", error.message);
        }
    });
}
testAi();
