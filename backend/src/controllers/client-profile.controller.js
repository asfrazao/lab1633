const clientProfileService = require('../services/client-profile.service');

async function handleListClientProfiles(req, res, next) {
  try {
    const profiles = await clientProfileService.listClientProfiles();
    return res.json({
      items: applyFilters(profiles, req.query || {}),
    });
  } catch (error) {
    return next(error);
  }
}

async function handleGetClientProfile(req, res, next) {
  try {
    const profile = await clientProfileService.getClientProfileExactByPhone(req.params.phone);

    if (!profile) {
      return res.status(404).json({
        error: 'Perfil não encontrado.',
      });
    }

    return res.json(profile);
  } catch (error) {
    return next(error);
  }
}

async function handleCreateClientProfile(req, res, next) {
  try {
    const profile = await clientProfileService.createClientProfile(req.body || {});
    return res.status(201).json({
      success: true,
      item: profile,
    });
  } catch (error) {
    return handleKnownError(error, res, next);
  }
}

async function handleUpdateClientProfile(req, res, next) {
  try {
    const profile = await clientProfileService.updateClientProfile(req.params.phone, req.body || {});

    if (!profile) {
      return res.status(404).json({
        error: 'Perfil não encontrado.',
      });
    }

    return res.json({
      success: true,
      item: profile,
    });
  } catch (error) {
    return handleKnownError(error, res, next);
  }
}

async function handleUpdateClientProfileProvider(req, res, next) {
  try {
    const profile = await clientProfileService.updateClientProfileProvider(req.params.phone, req.body?.provider);
    return res.json({
      success: true,
      item: profile,
    });
  } catch (error) {
    return handleKnownError(error, res, next);
  }
}

async function handleUpdateClientProfileStatus(req, res, next) {
  try {
    const profile = await clientProfileService.updateClientProfileStatus(req.params.phone, req.body?.ativo);

    if (!profile) {
      return res.status(404).json({
        error: 'Perfil não encontrado.',
      });
    }

    return res.json({
      success: true,
      item: profile,
    });
  } catch (error) {
    return handleKnownError(error, res, next);
  }
}

async function handleDeleteClientProfile(req, res, next) {
  try {
    const deletedProfile = await clientProfileService.deleteClientProfile(req.params.phone);

    if (!deletedProfile) {
      return res.status(404).json({
        error: 'Perfil não encontrado.',
      });
    }

    return res.json({
      success: true,
      deleted: deletedProfile,
    });
  } catch (error) {
    return handleKnownError(error, res, next);
  }
}

function applyFilters(profiles, query) {
  return profiles.filter((profile) => {
    if (query.active !== undefined) {
      const activeFilter = String(query.active).toLowerCase() === 'true';

      if (Boolean(profile.ativo) !== activeFilter) {
        return false;
      }
    }

    if (query.provider && String(profile.aiProvider).toLowerCase() !== String(query.provider).toLowerCase()) {
      return false;
    }

    if (query.tipoNegocio && String(profile.tipoNegocio).toLowerCase() !== String(query.tipoNegocio).toLowerCase()) {
      return false;
    }

    return true;
  });
}

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      error: error.message,
    });
  }

  return next(error);
}

module.exports = {
  handleCreateClientProfile,
  handleDeleteClientProfile,
  handleGetClientProfile,
  handleListClientProfiles,
  handleUpdateClientProfile,
  handleUpdateClientProfileProvider,
  handleUpdateClientProfileStatus,
};
