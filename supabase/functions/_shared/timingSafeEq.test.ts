import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { timingSafeEq, constantTimeEq } from './timingSafeEq.ts';

Deno.test('timingSafeEq — equal strings return true', () => {
  assertEquals(timingSafeEq('abc123', 'abc123'), true);
});

Deno.test('timingSafeEq — different lengths return false', () => {
  assertEquals(timingSafeEq('abc', 'abcd'), false);
});

Deno.test('timingSafeEq — same length different content returns false', () => {
  assertEquals(timingSafeEq('abc', 'xyz'), false);
});

Deno.test('timingSafeEq — both empty strings return true', () => {
  assertEquals(timingSafeEq('', ''), true);
});

Deno.test('timingSafeEq — unicode-safe (multi-byte chars compared char-by-char)', () => {
  assertEquals(timingSafeEq('café', 'café'), true);
  assertEquals(timingSafeEq('café', 'cafe'), false);
});

Deno.test('constantTimeEq alias points at same function', () => {
  assertEquals(constantTimeEq('hello', 'hello'), true);
  assertEquals(constantTimeEq('hello', 'world'), false);
});
