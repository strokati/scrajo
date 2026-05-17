import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

let key: Buffer;

function getKey(): Buffer {
	if (key) return key;
	const envKey = process.env.ENCRYPTION_KEY;
	if (!envKey) {
		throw new EncryptionError('ENCRYPTION_KEY environment variable is not set');
	}
	if (envKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(envKey)) {
		throw new EncryptionError('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
	}
	key = Buffer.from(envKey, 'hex');
	return key;
}

export class EncryptionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'EncryptionError';
	}
}

export function encryptApiKey(plaintext: string): {
	encrypted: string;
	iv: string;
	tag: string;
} {
	const k = getKey();
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv(ALGORITHM, k, iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return {
		encrypted: encrypted.toString('base64'),
		iv: iv.toString('base64'),
		tag: tag.toString('base64'),
	};
}

export function decryptApiKey(encrypted: string, iv: string, tag: string): string {
	const k = getKey();
	const ivBuffer = Buffer.from(iv, 'base64');
	const tagBuffer = Buffer.from(tag, 'base64');

	if (ivBuffer.length !== IV_BYTES) {
		throw new EncryptionError('Invalid IV length');
	}
	if (tagBuffer.length !== 16) {
		throw new EncryptionError('Invalid auth tag length');
	}

	const decipher = createDecipheriv(ALGORITHM, k, ivBuffer);
	decipher.setAuthTag(tagBuffer);
	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(encrypted, 'base64')),
		decipher.final(),
	]);
	return decrypted.toString('utf8');
}

export function maskApiKey(plaintext: string): string {
	if (plaintext.length <= 4) return '****';
	return `****${plaintext.slice(-4)}`;
}
