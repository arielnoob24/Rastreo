// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CODE_LENGTH, formatCode, generateCode, hashCode, normalizeCode } from './invite';

describe('invite', () => {
  it('genera códigos de 12 caracteres sin símbolos ambiguos', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode()).toMatch(new RegExp(`^[A-HJ-NP-Z2-9]{${CODE_LENGTH}}$`));
    }
  });

  it('no repite códigos', () => {
    const codes = new Set(Array.from({ length: 200 }, generateCode));
    expect(codes.size).toBe(200);
  });

  it('normaliza guiones, espacios y minúsculas', () => {
    expect(normalizeCode(' abcd-efgh jklm ')).toBe('ABCDEFGHJKLM');
  });

  it('el hash es estable, hexadecimal de 64 caracteres y no depende del formato', async () => {
    const a = await hashCode('ABCDEFGHJKLM');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashCode('abcd-efgh-jklm')).toBe(a);
    expect(await hashCode('ABCDEFGHJKLN')).not.toBe(a);
  });

  it('formatea en grupos de 4', () => {
    expect(formatCode('ABCDEFGHJKLM')).toBe('ABCD-EFGH-JKLM');
  });
});
