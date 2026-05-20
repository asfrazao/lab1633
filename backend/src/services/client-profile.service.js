const path = require('path');

const { readJsonArray, writeJsonArray } = require('../utils/jsonFile.util');
const { nowIso } = require('../utils/date.util');

const clientProfilesFilePath = path.join(__dirname, '..', 'data', 'client-profiles.json');
const VALID_PROVIDERS = ['mock', 'openai', 'auto'];

const defaultProfileTemplate = {
  id: 'default',
  telefone: '*',
  nomeCliente: 'Demonstração Lab1633',
  tipoNegocio: 'generico',
  aiProvider: 'mock',
  ativo: true,
  descricao: 'Perfil padrão para demonstrações gerais da Lab1633.',
  promptPerfil:
    'Você é o Agente Comercial da Lab1633. Seu objetivo é entender o negócio do usuário, identificar dores no WhatsApp, demonstrar como um agente de IA ajudaria, qualificar o lead e encaminhar para Alessandro quando houver interesse.',
};

function normalizePhone(rawPhone) {
  if (rawPhone === null || rawPhone === undefined) {
    return '';
  }

  const text = String(rawPhone).trim();

  if (text === '*') {
    return '*';
  }

  return text.replace(/\D/g, '');
}

async function ensureDefaultProfile() {
  const profiles = await readJsonArray(clientProfilesFilePath);
  const defaultIndex = profiles.findIndex((profile) => profile.telefone === '*' || profile.id === 'default');
  const timestamp = nowIso();
  let changed = false;

  if (defaultIndex < 0) {
    const defaultProfile = {
      ...defaultProfileTemplate,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    profiles.unshift(defaultProfile);
    changed = true;
  } else {
    const currentDefault = profiles[defaultIndex];
    const normalizedDefault = {
      ...defaultProfileTemplate,
      ...currentDefault,
      id: 'default',
      telefone: '*',
      aiProvider: normalizeProvider(currentDefault.aiProvider) || 'mock',
      ativo: true,
      createdAt: currentDefault.createdAt || timestamp,
      updatedAt: currentDefault.updatedAt || timestamp,
    };

    if (JSON.stringify(currentDefault) !== JSON.stringify(normalizedDefault)) {
      profiles[defaultIndex] = normalizedDefault;
      changed = true;
    }
  }

  for (let index = 0; index < profiles.length; index += 1) {
    const currentProfile = profiles[index];
    const normalizedProfile = normalizeStoredProfile(currentProfile, timestamp);

    if (JSON.stringify(currentProfile) !== JSON.stringify(normalizedProfile)) {
      profiles[index] = normalizedProfile;
      changed = true;
    }
  }

  if (changed) {
    await writeJsonArray(clientProfilesFilePath, profiles);
  }

  return findDefaultProfile(profiles);
}

async function listClientProfiles() {
  await ensureDefaultProfile();
  const profiles = await readJsonArray(clientProfilesFilePath);
  return sortProfiles(profiles);
}

async function getClientProfileByPhone(phone) {
  const normalizedPhone = normalizePhone(phone);
  const profiles = await listClientProfiles();
  const defaultProfile = findDefaultProfile(profiles);
  const profile = profiles.find((item) => {
    return item?.ativo !== false && item.telefone !== '*' && normalizePhone(item.telefone) === normalizedPhone;
  });

  return profile || defaultProfile;
}

async function getClientProfileExactByPhone(phone) {
  const normalizedPhone = normalizePhone(phone);
  const profiles = await listClientProfiles();
  const rawPhone = String(phone || '').trim().toLowerCase();

  if (rawPhone === 'default') {
    return findDefaultProfile(profiles);
  }

  return profiles.find((profile) => normalizePhone(profile.telefone) === normalizedPhone) || null;
}

async function getOrCreateClientProfileByPhone(phone) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone || normalizedPhone === '*') {
    return getClientProfileByPhone(phone);
  }

  const existingProfile = await getClientProfileExactByPhone(normalizedPhone);

  if (existingProfile) {
    return existingProfile;
  }

  const defaultProfile = await ensureDefaultProfile();
  return createProfileFromDefault(defaultProfile, normalizedPhone, defaultProfile.aiProvider || 'mock');
}

async function createClientProfile(payload = {}) {
  await ensureDefaultProfile();
  const profiles = await readJsonArray(clientProfilesFilePath);
  const normalizedPhone = normalizePhone(payload.telefone);

  if (!normalizedPhone || normalizedPhone === '*') {
    throwHttpError(400, 'Telefone obrigatório e deve conter dígitos.');
  }

  if (profiles.some((profile) => normalizePhone(profile.telefone) === normalizedPhone)) {
    throwHttpError(409, 'Perfil já existe para este telefone.');
  }

  const cleanPayload = validateProfilePayload(payload, { requireBaseFields: true });
  const timestamp = nowIso();
  const profile = {
    id: `profile-${normalizedPhone}`,
    telefone: normalizedPhone,
    nomeCliente: cleanPayload.nomeCliente,
    tipoNegocio: cleanPayload.tipoNegocio,
    aiProvider: cleanPayload.aiProvider || 'mock',
    ativo: cleanPayload.ativo ?? true,
    descricao: cleanPayload.descricao || '',
    promptPerfil:
      cleanPayload.promptPerfil || buildDefaultPrompt(cleanPayload.nomeCliente, cleanPayload.tipoNegocio),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  profiles.push(profile);
  await writeJsonArray(clientProfilesFilePath, profiles);
  return profile;
}

async function updateClientProfile(phone, payload = {}) {
  const normalizedPhone = normalizePhone(phone);

  if (isDefaultLookup(phone)) {
    throwHttpError(400, 'O perfil default não pode ser atualizado por esta rota.');
  }

  const profiles = await listClientProfiles();
  const index = profiles.findIndex((profile) => {
    return profile.telefone !== '*' && normalizePhone(profile.telefone) === normalizedPhone;
  });

  if (index < 0) {
    return null;
  }

  const cleanPayload = validateProfilePayload(payload, { requireBaseFields: false });
  const existingProfile = profiles[index];
  const updatedProfile = {
    ...existingProfile,
    ...pickDefined(cleanPayload),
    telefone: existingProfile.telefone,
    id: existingProfile.id,
    createdAt: existingProfile.createdAt || nowIso(),
    updatedAt: nowIso(),
  };

  profiles[index] = updatedProfile;
  await writeJsonArray(clientProfilesFilePath, profiles);
  return updatedProfile;
}

async function updateClientProfileProvider(phone, provider) {
  const normalizedProvider = normalizeProvider(provider);
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone || isDefaultLookup(phone)) {
    throwHttpError(400, 'Telefone inválido.');
  }

  if (!normalizedProvider) {
    throwHttpError(400, 'Provider inválido. Use "mock", "openai" ou "auto".');
  }

  await ensureDefaultProfile();
  const profiles = await readJsonArray(clientProfilesFilePath);
  const index = profiles.findIndex((item) => {
    return item.telefone !== '*' && normalizePhone(item.telefone) === normalizedPhone;
  });

  let updatedProfile;

  if (index >= 0) {
    updatedProfile = {
      ...profiles[index],
      telefone: normalizedPhone,
      aiProvider: normalizedProvider,
      createdAt: profiles[index].createdAt || nowIso(),
      updatedAt: nowIso(),
    };
    profiles[index] = updatedProfile;
  } else {
    const defaultProfile = findDefaultProfile(profiles);
    updatedProfile = buildPhoneProfile(defaultProfile, normalizedPhone, normalizedProvider);
    profiles.push(updatedProfile);
  }

  await writeJsonArray(clientProfilesFilePath, profiles);
  return updatedProfile;
}

async function updateClientProfileStatus(phone, ativo) {
  const normalizedPhone = normalizePhone(phone);

  if (isDefaultLookup(phone)) {
    throwHttpError(400, 'O perfil default não pode ser desativado.');
  }

  if (typeof ativo !== 'boolean') {
    throwHttpError(400, 'Campo "ativo" deve ser boolean.');
  }

  const profiles = await listClientProfiles();
  const index = profiles.findIndex((profile) => {
    return profile.telefone !== '*' && normalizePhone(profile.telefone) === normalizedPhone;
  });

  if (index < 0) {
    return null;
  }

  const updatedProfile = {
    ...profiles[index],
    ativo,
    updatedAt: nowIso(),
  };
  profiles[index] = updatedProfile;
  await writeJsonArray(clientProfilesFilePath, profiles);
  return updatedProfile;
}

async function deleteClientProfile(phone) {
  const normalizedPhone = normalizePhone(phone);

  if (isDefaultLookup(phone)) {
    throwHttpError(400, 'O perfil default não pode ser removido.');
  }

  const profiles = await listClientProfiles();
  const index = profiles.findIndex((profile) => {
    return profile.telefone !== '*' && normalizePhone(profile.telefone) === normalizedPhone;
  });

  if (index < 0) {
    return null;
  }

  const [removedProfile] = profiles.splice(index, 1);
  await writeJsonArray(clientProfilesFilePath, profiles);
  return removedProfile;
}

async function assignClientProfile(phone, profileId) {
  const normalizedPhone = normalizePhone(phone);
  const profiles = await listClientProfiles();
  const baseProfile = profiles.find((item) => item.id === profileId && item.ativo !== false);

  if (!normalizedPhone || normalizedPhone === '*' || !baseProfile) {
    return null;
  }

  const assignedProfile = {
    ...baseProfile,
    id: `profile-${normalizedPhone}`,
    telefone: normalizedPhone,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const index = profiles.findIndex((item) => item.telefone !== '*' && normalizePhone(item.telefone) === normalizedPhone);

  if (index >= 0) {
    profiles[index] = assignedProfile;
  } else {
    profiles.push(assignedProfile);
  }

  await writeJsonArray(clientProfilesFilePath, profiles);
  return assignedProfile;
}

async function createProfileFromDefault(defaultProfile, normalizedPhone, provider) {
  const profiles = await readJsonArray(clientProfilesFilePath);
  const profile = buildPhoneProfile(defaultProfile, normalizedPhone, provider);
  profiles.push(profile);
  await writeJsonArray(clientProfilesFilePath, profiles);
  return profile;
}

function buildPhoneProfile(defaultProfile, normalizedPhone, provider) {
  const timestamp = nowIso();

  return {
    id: `profile-${normalizedPhone}`,
    telefone: normalizedPhone,
    nomeCliente: defaultProfile.nomeCliente || 'Demonstração Lab1633',
    tipoNegocio: defaultProfile.tipoNegocio || 'generico',
    aiProvider: provider,
    ativo: true,
    descricao: defaultProfile.descricao || '',
    promptPerfil:
      defaultProfile.promptPerfil || buildDefaultPrompt(defaultProfile.nomeCliente, defaultProfile.tipoNegocio),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function validateProfilePayload(payload, { requireBaseFields }) {
  const cleanPayload = {};

  if (requireBaseFields || Object.prototype.hasOwnProperty.call(payload, 'nomeCliente')) {
    cleanPayload.nomeCliente = validateRequiredString(payload.nomeCliente, 'nomeCliente');
  }

  if (requireBaseFields || Object.prototype.hasOwnProperty.call(payload, 'tipoNegocio')) {
    cleanPayload.tipoNegocio = validateRequiredString(payload.tipoNegocio, 'tipoNegocio');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'aiProvider')) {
    const provider = normalizeProvider(payload.aiProvider);

    if (!provider) {
      throwHttpError(400, 'Provider inválido. Use "mock", "openai" ou "auto".');
    }

    cleanPayload.aiProvider = provider;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'ativo')) {
    if (typeof payload.ativo !== 'boolean') {
      throwHttpError(400, 'Campo "ativo" deve ser boolean.');
    }

    cleanPayload.ativo = payload.ativo;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'descricao')) {
    cleanPayload.descricao = validateOptionalString(payload.descricao, 'descricao');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'promptPerfil')) {
    cleanPayload.promptPerfil = validateOptionalString(payload.promptPerfil, 'promptPerfil');
  }

  return cleanPayload;
}

function normalizeStoredProfile(profile, timestamp) {
  if (profile.telefone === '*' || profile.id === 'default') {
    return {
      ...defaultProfileTemplate,
      ...profile,
      id: 'default',
      telefone: '*',
      aiProvider: normalizeProvider(profile.aiProvider) || 'mock',
      ativo: true,
      createdAt: profile.createdAt || timestamp,
      updatedAt: profile.updatedAt || timestamp,
    };
  }

  const telefone = normalizePhone(profile.telefone);

  return {
    id: profile.id || `profile-${telefone}`,
    telefone,
    nomeCliente: typeof profile.nomeCliente === 'string' && profile.nomeCliente.trim()
      ? profile.nomeCliente.trim()
      : 'Demonstração Lab1633',
    tipoNegocio: typeof profile.tipoNegocio === 'string' && profile.tipoNegocio.trim()
      ? profile.tipoNegocio.trim()
      : 'generico',
    aiProvider: normalizeProvider(profile.aiProvider) || 'mock',
    ativo: typeof profile.ativo === 'boolean' ? profile.ativo : true,
    descricao: typeof profile.descricao === 'string' ? profile.descricao : '',
    promptPerfil: typeof profile.promptPerfil === 'string' && profile.promptPerfil.trim()
      ? profile.promptPerfil.trim()
      : buildDefaultPrompt(profile.nomeCliente, profile.tipoNegocio),
    createdAt: profile.createdAt || timestamp,
    updatedAt: profile.updatedAt || timestamp,
  };
}

function validateRequiredString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throwHttpError(400, `Campo "${fieldName}" é obrigatório.`);
  }

  return value.trim();
}

function validateOptionalString(value, fieldName) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value !== 'string') {
    throwHttpError(400, `Campo "${fieldName}" deve ser string.`);
  }

  return value.trim();
}

function buildDefaultPrompt(nomeCliente, tipoNegocio) {
  return `Você é um agente de atendimento para ${nomeCliente || 'este cliente'} no segmento ${tipoNegocio || 'generico'}. Ajude a entender a necessidade do usuário, coletar dados importantes, qualificar o atendimento e encaminhar quando houver interesse.`;
}

function findDefaultProfile(profiles) {
  return profiles.find((item) => item?.ativo !== false && item.telefone === '*') || {
    ...defaultProfileTemplate,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function normalizeProvider(provider) {
  const normalizedProvider = String(provider || '').toLowerCase().trim();
  return VALID_PROVIDERS.includes(normalizedProvider) ? normalizedProvider : null;
}

function isDefaultLookup(phone) {
  const rawPhone = String(phone || '').trim().toLowerCase();
  return rawPhone === 'default' || normalizePhone(phone) === '*';
}

function sortProfiles(profiles) {
  return [...profiles].sort((a, b) => {
    return String(a.nomeCliente || '').localeCompare(String(b.nomeCliente || ''), 'pt-BR');
  });
}

function pickDefined(payload) {
  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }

    return acc;
  }, {});
}

function throwHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

module.exports = {
  assignClientProfile,
  createClientProfile,
  deleteClientProfile,
  ensureDefaultProfile,
  getClientProfileByPhone,
  getClientProfileExactByPhone,
  getOrCreateClientProfileByPhone,
  listClientProfiles,
  normalizePhone,
  updateClientProfile,
  updateClientProfileProvider,
  updateClientProfileStatus,
};
