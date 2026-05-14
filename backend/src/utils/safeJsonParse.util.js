function safeJsonParse(text) {
  try {
    if (!text || typeof text !== 'string') {
      return null;
    }

    let cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    cleaned = cleaned.slice(firstBrace, lastBrace + 1);

    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

module.exports = {
  safeJsonParse,
};
