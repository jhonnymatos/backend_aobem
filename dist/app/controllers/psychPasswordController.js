"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.psychPasswordController = void 0;
const PsychRepository_1 = require("../repositories/PsychRepository");
const api_errors_1 = require("../helpers/api-errors");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const JWT_SECRET = (_a = process.env.JWT_SECRET) !== null && _a !== void 0 ? _a : 'some super secret...';
class psychPasswordController {
    async forgotPassword(req, res) {
        const { email } = req.body;
        console.log('Request Body:', req.body);
        const psych = await PsychRepository_1.psychRepository.findOneBy({ email });
        if (!psych) {
            throw new api_errors_1.BadRequestError('Especialista não registrado');
        }
        const secret = JWT_SECRET + psych.password;
        const payload = { email: psych.email, id: psych.id };
        const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: '15m' });
        const link = `http://localhost:3333/reset-password/psych/${psych.id}/${token}`;
        const transporter = nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_PSYCHS,
                pass: process.env.EMAIL_PASS,
            },
        });
        const mailOptions = {
            from: process.env.EMAIL_PSYCHS,
            to: psych.email,
            subject: 'Redefinição de senha',
            text: `Clique no link para redefinir sua senha: ${link}`,
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Erro ao enviar email:', error);
                return res.status(500).json({ message: 'Erro ao enviar email' });
            }
            return res.status(200).json({ message: 'Link de redefinição de senha enviado para o seu e-mail' });
        });
    }
    async resetPassword(req, res) {
        const { id, token } = req.params;
        const { password, password2 } = req.body;
        console.log('Request Params:', req.params);
        console.log('Request Body:', req.body);
        if (password !== password2) {
            throw new api_errors_1.BadRequestError('As senhas não coincidem');
        }
        const psychId = Number(id);
        if (isNaN(psychId)) {
            throw new api_errors_1.BadRequestError('ID inválido');
        }
        const psych = await PsychRepository_1.psychRepository.findOneBy({ id: psychId });
        if (!psych) {
            throw new api_errors_1.BadRequestError('ID inválido');
        }
        const secret = JWT_SECRET + psych.password;
        try {
            jsonwebtoken_1.default.verify(token, secret);
            const hashPassword = await bcrypt_1.default.hash(password, 10);
            psych.password = hashPassword;
            await PsychRepository_1.psychRepository.save(psych);
            return res.status(200).json({ message: 'Senha redefinida com sucesso' });
        }
        catch (error) {
            return res.status(400).json({ message: 'Token inválido ou expirado' });
        }
    }
}
exports.psychPasswordController = psychPasswordController;
