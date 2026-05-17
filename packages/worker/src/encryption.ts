import { createDecipheriv } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

export function decryptApiKey(
	encrypted: string,
	iv: string,
	tag: string,
	encryptionKey: string,
): string {
	const key = Buffer.from(encryptionKey, 'hex');
	const ivBuffer = Buffer.from(iv, 'base64');
	const tagBuffer = Buffer.from(tag, 'base64');

	if (ivBuffer.length !== IV_BYTES) {
		throw new Error('Invalid IV length');
	}
	if (tagBuffer.length !== 16) {
		throw new Error('Invalid auth tag length');
	}

	const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);
	decipher.setAuthTag(tagBuffer);
	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(encrypted, 'base64')),
		decipher.final(),
	]);
	return decrypted.toString('utf8');
}
