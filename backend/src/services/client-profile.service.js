const path = require('path');
const { readJsonArray, writeJsonArray } = require('../utils/jsonFile.util');

const clientProfilesFilePath = path.join(__dirname, '..', 'data', 'client-profiles.json');
const VALID_PROVIDERS = ['mock', 'openai', 'auto'];

const memoryDefaultProfile = {
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

  const digits = String(rawPhone).replace(/\D/g, '');
  return digits;
}

async function listClientProfiles() {
  return readJsonArray(clientProfilesFilePath);
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

async function getOrCreateClientProfileByPhone(phone) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return getClientProfileByPhone(phone);
  }

  const profiles = await listClientProfiles();
  const existingProfile = profiles.find((item) => {
    return item?.ativo !== false && item.telefone !== '*' && normalizePhone(item.telefone) === normalizedPhone;
  });

  if (existingProfile) {
    return existingProfile;
  }

  const defaultProfile = findDefaultProfile(profiles);
  const profile = buildPhoneProfile(defaultProfile, normalizedPhone, defaultProfile.aiProvider || 'mock');
  profiles.push(profile);
  await writeJsonArray(clientProfilesFilePath, profiles);

  return profile;
}

async function updateClientProfileProvider(phone, provider) {
  const normalizedProvider = normalizeProvider(provider);
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    const error = new Error('Telefone invalido.');
    error.statusCode = 400;
    throw error;
  }

  if (!normalizedProvider) {
    const error = new Error('Provider invalido. Use "mock", "openai" ou "auto".');
    error.statusCode = 400;
    throw error;
  }

  const profiles = await listClientProfiles();
  const defaultProfile = findDefaultProfile(profiles);
  const index = profiles.findIndex((item) => {
    return item.telefone !== '*' && normalizePhone(item.telefone) === normalizedPhone;
  });

  let updatedProfile;

  if (index >= 0) {
    updatedProfile = {
      ...profiles[index],
      telefone: normalizedPhone,
      aiProvider: normalizedProvider,
      ativo: profiles[index].ativo !== false,
    };
    profiles[index] = updatedProfile;
  } else {
    updatedProfile = buildPhoneProfile(defaultProfile, normalizedPhone, normalizedProvider);
    profiles.push(updatedProfile);
  }

  await writeJsonArray(clientProfilesFilePath, profiles);
  return updatedProfile;
}

async function assignClientProfile(phone, profileId) {
  const normalizedPhone = normalizePhone(phone);
  const profiles = await listClientProfiles();
  const baseProfile = profiles.find((item) => item.id === profileId && item.ativo !== false);

  if (!normalizedPhone || !baseProfile) {
    return null;
  }

  const assignedProfile = {
    ...baseProfile,
    id: `profile-${normalizedPhone}-${baseProfile.id}`,
    telefone: normalizedPhone,
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

function findDefaultProfile(profiles) {
  return profiles.find((item) => item?.ativo !== false && item.telefone === '*') || memoryDefaultProfile;
}

function buildPhoneProfile(defaultProfile, normalizedPhone, provider) {
  return {
    ...defaultProfile,
    id: `profile-${normalizedPhone}`,
    telefone: normalizedPhone,
    nomeCliente: defaultProfile.nomeCliente || 'Demonstração Lab1633',
    tipoNegocio: defaultProfile.tipoNegocio || 'generico',
    aiProvider: provider,
    ativo: true,
  };
}

function normalizeProvider(provider) {
  const normalizedProvider = String(provider || '').toLowerCase().trim();
  return VALID_PROVIDERS.includes(normalizedProvider) ? normalizedProvider : null;
}

module.exports = {
  assignClientProfile,
  getClientProfileByPhone,
  getOrCreateClientProfileByPhone,
  listClientProfiles,
  normalizePhone,
  updateClientProfileProvider,
};
