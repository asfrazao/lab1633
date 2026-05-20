const clientProfileService = require('../services/client-profile.service');

async function handleListClientProfiles(req, res, next) {
  try {
    const profiles = await clientProfileService.listClientProfiles();
    return res.json(profiles);
  } catch (error) {
    return next(error);
  }
}

async function handleGetClientProfile(req, res, next) {
  try {
    const profile = await clientProfileService.getClientProfileByPhone(req.params.phone);
    return res.json(profile);
  } catch (error) {
    return next(error);
  }
}

async function handleUpdateClientProfileProvider(req, res, next) {
  try {
    const profile = await clientProfileService.updateClientProfileProvider(req.params.phone, req.body?.provider);
    return res.json(profile);
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        erro: error.message,
      });
    }

    return next(error);
  }
}

module.exports = {
  handleGetClientProfile,
  handleListClientProfiles,
  handleUpdateClientProfileProvider,
};
