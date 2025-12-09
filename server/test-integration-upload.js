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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
function test() {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = path_1.default.join(__dirname, '../frontend/src/assets/DirtyWater.png');
        if (!fs_1.default.existsSync(filePath)) {
            console.error("❌ File not found:", filePath);
            return;
        }
        const form = new form_data_1.default();
        form.append('file', fs_1.default.createReadStream(filePath));
        console.log('Uploading DirtyWater.png via http://localhost:5000/api/upload ...');
        try {
            const res = yield axios_1.default.post('http://localhost:5000/api/upload', form, {
                headers: Object.assign({}, form.getHeaders())
            });
            console.log('✅ Success!', res.data);
        }
        catch (err) {
            console.error('❌ Failed:', err.response ? err.response.data : err.message);
        }
    });
}
test();
