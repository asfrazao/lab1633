const fs = require('fs/promises');
const path = require('path');

async function ensureJsonArrayFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    const content = await fs.readFile(filePath, 'utf8');

    if (!content.trim()) {
      await writeJsonArray(filePath, []);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    await writeJsonArray(filePath, []);
  }
}

async function readJsonArray(filePath) {
  await ensureJsonArrayFile(filePath);

  const content = removeBom(await fs.readFile(filePath, 'utf8'));

  if (!content.trim()) {
    return [];
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error('[JsonFile] JSON invalido:', {
      filePath,
      message: error.message,
    });
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.error('[JsonFile] JSON deve conter um array:', {
      filePath,
      parsedType: typeof parsed,
    });
    return [];
  }

  return parsed;
}

async function writeJsonArray(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFilePath, JSON.stringify(data, null, 2), 'utf8');

  try {
    await renameWithRetry(tempFilePath, filePath);
  } catch (error) {
    console.error('[JsonFile] Falha ao renomear arquivo temporario. Usando copyFile como fallback:', {
      filePath,
      tempFilePath,
      message: error.message,
    });

    await fs.copyFile(tempFilePath, filePath);
    await removeTempFile(tempFilePath);
  }
}

async function renameWithRetry(sourcePath, targetPath, attempts = 5) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await fs.rename(sourcePath, targetPath);
      return;
    } catch (error) {
      lastError = error;

      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt === attempts) {
        break;
      }

      await delay(100 * attempt);
    }
  }

  throw lastError;
}

async function removeTempFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('[JsonFile] Falha ao remover arquivo temporario:', {
        filePath,
        message: error.message,
      });
    }
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function removeBom(content) {
  return content.replace(/^\uFEFF/, '');
}

module.exports = {
  readJsonArray,
  writeJsonArray,
};
