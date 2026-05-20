(function () {
  const state = {
    profiles: [],
    notifications: [],
    activeTab: 'overview',
    editingPhone: null,
  };

  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindElements();
    bindEvents();
    els.adminToken.value = localStorage.getItem('lab1633_admin_token') || '';
    loadAll();
  }

  function bindElements() {
    [
      'apiStatus',
      'refreshBtn',
      'adminToken',
      'metricApi',
      'metricApiDetail',
      'metricOpenAI',
      'metricOpenAIDetail',
      'metricProfiles',
      'metricUnread',
      'profileSearch',
      'providerFilter',
      'statusFilter',
      'profilesTable',
      'profilesEmpty',
      'newProfileBtn',
      'profileModal',
      'profileModalTitle',
      'profileModalSubtitle',
      'profileForm',
      'profileMode',
      'profilePhone',
      'profileName',
      'profileBusiness',
      'profileProvider',
      'profileActive',
      'profileDescription',
      'profilePrompt',
      'generatePromptBtn',
      'detailsModal',
      'detailsContent',
      'notificationFilter',
      'notificationsList',
      'notificationsEmpty',
      'testerForm',
      'testerPhone',
      'testerMessage',
      'testerResult',
      'clearTesterBtn',
      'debugProfileBtn',
      'debugAgenticBtn',
      'toastHost',
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    document.querySelectorAll('.nav-tab, [data-tab-jump]').forEach((button) => {
      button.addEventListener('click', () => switchTab(button.dataset.tab || button.dataset.tabJump));
    });

    els.refreshBtn.addEventListener('click', loadCurrentTab);
    els.adminToken.addEventListener('input', () => {
      localStorage.setItem('lab1633_admin_token', els.adminToken.value.trim());
    });

    els.profileSearch.addEventListener('input', renderProfiles);
    els.providerFilter.addEventListener('change', renderProfiles);
    els.statusFilter.addEventListener('change', renderProfiles);
    els.notificationFilter.addEventListener('change', renderNotifications);

    els.newProfileBtn.addEventListener('click', openCreateProfileModal);
    els.profileForm.addEventListener('submit', saveProfile);
    els.generatePromptBtn.addEventListener('click', generateDefaultPrompt);
    document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeProfileModal));
    document.querySelectorAll('[data-close-details]').forEach((button) => button.addEventListener('click', closeDetailsModal));

    els.testerForm.addEventListener('submit', submitAgentTest);
    els.clearTesterBtn.addEventListener('click', () => {
      els.testerResult.textContent = 'Nenhum teste executado.';
    });
    els.debugProfileBtn.addEventListener('click', () => runDebug(`/debug/profile/${normalizePhone(els.testerPhone.value)}`));
    els.debugAgenticBtn.addEventListener('click', () => runDebug(`/debug/agentic/${normalizePhone(els.testerPhone.value)}`));
  }

  async function loadAll() {
    await Promise.allSettled([loadOverview(), loadProfiles(), loadNotifications()]);
  }

  async function loadCurrentTab() {
    if (state.activeTab === 'overview') await loadOverview();
    if (state.activeTab === 'profiles') await loadProfiles();
    if (state.activeTab === 'notifications') await loadNotifications();
    if (state.activeTab === 'tester') await loadOverview();
  }

  function switchTab(tab) {
    if (!tab) return;
    state.activeTab = tab;
    document.querySelectorAll('.nav-tab').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === tab));
    loadCurrentTab();
  }

  async function loadOverview() {
    try {
      const [health, ai, profiles, unread] = await Promise.all([
        apiFetch('/health'),
        apiFetch('/debug/ai'),
        apiFetch('/client-profiles'),
        apiFetch('/notifications/unread'),
      ]);

      els.apiStatus.textContent = 'Online';
      els.apiStatus.className = 'status-pill online';
      els.metricApi.textContent = health.status === 'ok' ? 'Online' : 'Instável';
      els.metricApiDetail.textContent = health.service || 'GET /health';
      els.metricOpenAI.textContent = ai.openaiConfigured ? 'Configurada' : 'Não configurada';
      els.metricOpenAIDetail.textContent = `${ai.openaiModel || 'modelo n/d'} · global ${ai.aiProviderGlobal || 'mock'}`;
      els.metricProfiles.textContent = String((profiles.items || []).length);
      els.metricUnread.textContent = String((unread.items || []).length);
    } catch (error) {
      els.apiStatus.textContent = 'Offline';
      els.apiStatus.className = 'status-pill offline';
      showToast(error.message || 'Não foi possível carregar o status.', 'error');
    }
  }

  async function loadProfiles() {
    try {
      const data = await apiFetch('/client-profiles');
      state.profiles = data.items || [];
      renderProfiles();
    } catch (error) {
      showToast(error.message || 'Não foi possível carregar perfis.', 'error');
    }
  }

  function renderProfiles() {
    const query = normalizeText(els.profileSearch.value);
    const provider = els.providerFilter.value;
    const status = els.statusFilter.value;
    const filtered = state.profiles.filter((profile) => {
      const text = normalizeText(`${profile.nomeCliente} ${profile.telefone} ${profile.tipoNegocio}`);
      if (query && !text.includes(query)) return false;
      if (provider && profile.aiProvider !== provider) return false;
      if (status === 'active' && !profile.ativo) return false;
      if (status === 'inactive' && profile.ativo) return false;
      return true;
    });

    els.profilesTable.innerHTML = filtered.map(renderProfileRow).join('');
    els.profilesEmpty.classList.toggle('hidden', filtered.length > 0);
    bindProfileRowEvents();
  }

  function renderProfileRow(profile) {
    const isDefault = profile.id === 'default' || profile.telefone === '*';
    return `
      <tr>
        <td><strong>${escapeHtml(profile.nomeCliente)}</strong><small>${escapeHtml(profile.descricao || '')}</small></td>
        <td>${escapeHtml(profile.telefone)}</td>
        <td>${escapeHtml(profile.tipoNegocio)}</td>
        <td>
          <select class="provider-select" data-action="provider" data-phone="${escapeAttr(profile.telefone)}" ${isDefault ? 'disabled' : ''}>
            ${['mock', 'openai', 'auto'].map((item) => `<option value="${item}" ${profile.aiProvider === item ? 'selected' : ''}>${item}</option>`).join('')}
          </select>
        </td>
        <td><span class="badge ${profile.ativo ? 'active' : 'inactive'}">${profile.ativo ? 'ativo' : 'inativo'}</span></td>
        <td>${formatDate(profile.updatedAt)}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-ghost" data-action="view" data-phone="${escapeAttr(profile.telefone)}">Ver</button>
            <button class="btn btn-secondary" data-action="edit" data-phone="${escapeAttr(profile.telefone)}">Editar</button>
            <button class="btn btn-secondary" data-action="toggle" data-phone="${escapeAttr(profile.telefone)}" ${isDefault ? 'disabled' : ''}>${profile.ativo ? 'Desativar' : 'Ativar'}</button>
            <button class="btn btn-danger" data-action="delete" data-phone="${escapeAttr(profile.telefone)}" ${isDefault ? 'disabled' : ''}>Excluir</button>
          </div>
        </td>
      </tr>
    `;
  }

  function bindProfileRowEvents() {
    els.profilesTable.querySelectorAll('[data-action]').forEach((element) => {
      element.addEventListener('click', handleProfileAction);
      element.addEventListener('change', handleProfileAction);
    });
  }

  async function handleProfileAction(event) {
    const action = event.currentTarget.dataset.action;
    const phone = event.currentTarget.dataset.phone;
    const profile = state.profiles.find((item) => item.telefone === phone);
    if (!profile) return;

    if (action === 'view') openDetailsModal(profile);
    if (action === 'edit') openEditProfileModal(profile);
    if (action === 'toggle') await toggleProfile(profile);
    if (action === 'delete') await deleteProfile(profile);
    if (action === 'provider') await changeProvider(profile, event.currentTarget.value);
  }

  function openCreateProfileModal() {
    state.editingPhone = null;
    els.profileModalTitle.textContent = 'Novo perfil';
    els.profileModalSubtitle.textContent = 'Cadastre um número para testar um agente específico.';
    els.profileMode.value = 'create';
    els.profilePhone.disabled = false;
    els.profileForm.reset();
    els.profileActive.checked = true;
    els.profileProvider.value = 'mock';
    els.profileModal.classList.remove('hidden');
  }

  function openEditProfileModal(profile) {
    state.editingPhone = profile.telefone;
    els.profileModalTitle.textContent = 'Editar perfil';
    els.profileModalSubtitle.textContent = profile.telefone;
    els.profileMode.value = 'edit';
    els.profilePhone.value = profile.telefone;
    els.profilePhone.disabled = true;
    els.profileName.value = profile.nomeCliente || '';
    els.profileBusiness.value = profile.tipoNegocio || '';
    els.profileProvider.value = profile.aiProvider || 'mock';
    els.profileActive.checked = Boolean(profile.ativo);
    els.profileDescription.value = profile.descricao || '';
    els.profilePrompt.value = profile.promptPerfil || '';
    els.profileModal.classList.remove('hidden');
  }

  function closeProfileModal() {
    els.profileModal.classList.add('hidden');
  }

  async function saveProfile(event) {
    event.preventDefault();
    const mode = els.profileMode.value;
    const payload = {
      telefone: normalizePhone(els.profilePhone.value),
      nomeCliente: els.profileName.value.trim(),
      tipoNegocio: els.profileBusiness.value.trim(),
      aiProvider: els.profileProvider.value,
      ativo: els.profileActive.checked,
      descricao: els.profileDescription.value.trim(),
      promptPerfil: els.profilePrompt.value.trim(),
    };

    if (!payload.promptPerfil) {
      payload.promptPerfil = buildPrompt(payload.nomeCliente, payload.tipoNegocio);
    }

    try {
      if (mode === 'create') {
        await apiFetch('/client-profiles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Perfil criado com sucesso.', 'success');
      } else {
        delete payload.telefone;
        await apiFetch(`/client-profiles/${encodeURIComponent(state.editingPhone)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Perfil atualizado.', 'success');
      }

      closeProfileModal();
      await loadProfiles();
      await loadOverview();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  function generateDefaultPrompt() {
    els.profilePrompt.value = buildPrompt(els.profileName.value.trim(), els.profileBusiness.value.trim());
  }

  function buildPrompt(nomeCliente, tipoNegocio) {
    return `Você é um agente de atendimento para ${nomeCliente || 'este cliente'} no segmento ${tipoNegocio || 'generico'}. Ajude a entender a necessidade do usuário, coletar dados importantes, qualificar o atendimento e encaminhar quando houver interesse.`;
  }

  function openDetailsModal(profile) {
    els.detailsContent.innerHTML = `
      <div class="details-list">
        ${detailRow('Cliente', profile.nomeCliente)}
        ${detailRow('Telefone', profile.telefone)}
        ${detailRow('Tipo de negócio', profile.tipoNegocio)}
        ${detailRowHtml('Provider', `<span class="badge ${escapeAttr(profile.aiProvider)}">${escapeHtml(profile.aiProvider)}</span>`)}
        ${detailRowHtml('Status', `<span class="badge ${profile.ativo ? 'active' : 'inactive'}">${profile.ativo ? 'ativo' : 'inativo'}</span>`)}
        ${detailRow('Descrição', profile.descricao || '-')}
        ${detailRowHtml('Prompt', `<div class="prompt-box">${escapeHtml(profile.promptPerfil || '-')}</div>`)}
        ${detailRow('Criado em', formatDate(profile.createdAt))}
        ${detailRow('Atualizado em', formatDate(profile.updatedAt))}
        ${detailRowHtml('Comandos úteis', '<code>#mock</code> · <code>#openai</code> · <code>#status</code> · <code>#perfil</code>')}
        ${detailRow('Teste WhatsApp', 'Envie uma mensagem para o WhatsApp conectado e use #status para validar o perfil.')}
      </div>
    `;
    els.detailsModal.classList.remove('hidden');
  }

  function closeDetailsModal() {
    els.detailsModal.classList.add('hidden');
  }

  function detailRow(label, value) {
    return `<div class="detail-row"><span>${escapeHtml(label)}</span><div>${escapeHtml(value || '')}</div></div>`;
  }

  function detailRowHtml(label, html) {
    return `<div class="detail-row"><span>${escapeHtml(label)}</span><div>${html || ''}</div></div>`;
  }

  async function changeProvider(profile, provider) {
    if (provider === 'openai' && !window.confirm('Ativar OpenAI pode gerar custo. Deseja continuar?')) {
      renderProfiles();
      return;
    }

    try {
      await apiFetch(`/client-profiles/${encodeURIComponent(profile.telefone)}/provider`, {
        method: 'PATCH',
        body: JSON.stringify({ provider }),
      });
      showToast('Provider alterado.', 'success');
      await loadProfiles();
      await loadOverview();
    } catch (error) {
      showToast(error.message, 'error');
      renderProfiles();
    }
  }

  async function toggleProfile(profile) {
    try {
      await apiFetch(`/client-profiles/${encodeURIComponent(profile.telefone)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !profile.ativo }),
      });
      showToast(profile.ativo ? 'Perfil desativado.' : 'Perfil reativado.', 'success');
      await loadProfiles();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function deleteProfile(profile) {
    const confirmed = window.confirm('Tem certeza que deseja excluir este perfil? Essa ação não apaga leads/conversas já salvos, mas remove a configuração do número.');
    if (!confirmed) return;

    try {
      await apiFetch(`/client-profiles/${encodeURIComponent(profile.telefone)}`, { method: 'DELETE' });
      showToast('Perfil excluído.', 'success');
      await loadProfiles();
      await loadOverview();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function loadNotifications() {
    try {
      const data = await apiFetch('/notifications');
      state.notifications = data.items || [];
      renderNotifications();
    } catch (error) {
      showToast(error.message || 'Não foi possível carregar notificações.', 'error');
    }
  }

  function renderNotifications() {
    const filter = els.notificationFilter.value;
    const filtered = state.notifications.filter((item) => {
      if (filter === 'unread') return !item.read && item.status !== 'resolvida';
      if (filter === 'resolved') return item.status === 'resolvida';
      return true;
    });

    els.notificationsList.innerHTML = filtered.map(renderNotification).join('');
    els.notificationsEmpty.classList.toggle('hidden', filtered.length > 0);
    els.notificationsList.querySelectorAll('[data-notification-action]').forEach((button) => {
      button.addEventListener('click', handleNotificationAction);
    });
  }

  function renderNotification(item) {
    return `
      <article class="notification-card">
        <div class="notification-head">
          <div>
            <h3>${escapeHtml(item.titulo || 'Notificação')}</h3>
            <p>${escapeHtml(item.mensagem || '')}</p>
          </div>
          <div class="row-actions">
            <button class="btn btn-secondary" data-notification-action="read" data-id="${escapeAttr(item.id)}" ${item.read ? 'disabled' : ''}>Marcar lida</button>
            <button class="btn btn-primary" data-notification-action="resolve" data-id="${escapeAttr(item.id)}" ${item.status === 'resolvida' ? 'disabled' : ''}>Resolver</button>
          </div>
        </div>
        <div class="notification-meta">
          <span class="badge ${item.read ? 'active' : 'warning'}">${item.read ? 'lida' : 'não lida'}</span>
          <span class="badge ${item.status === 'resolvida' ? 'active' : 'mock'}">${escapeHtml(item.status || 'nova')}</span>
          <span>${escapeHtml(item.telefone || '-')}</span>
          <span>${escapeHtml(item.nome || '-')}</span>
          <span>${escapeHtml(item.tipoNegocio || '-')}</span>
        </div>
        <small>Criada: ${formatDate(item.createdAt)} · Atualizada: ${formatDate(item.updatedAt)}</small>
      </article>
    `;
  }

  async function handleNotificationAction(event) {
    const id = event.currentTarget.dataset.id;
    const action = event.currentTarget.dataset.notificationAction;
    try {
      await apiFetch(`/notifications/${encodeURIComponent(id)}/${action === 'read' ? 'read' : 'resolve'}`, { method: 'PATCH' });
      showToast(action === 'read' ? 'Notificação marcada como lida.' : 'Notificação resolvida.', 'success');
      await loadNotifications();
      await loadOverview();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function submitAgentTest(event) {
    event.preventDefault();
    const phone = normalizePhone(els.testerPhone.value);
    const message = els.testerMessage.value.trim();

    if (!phone || !message) {
      showToast('Informe telefone e mensagem.', 'warning');
      return;
    }

    try {
      const result = await apiFetch('/chat-teste', {
        method: 'POST',
        body: JSON.stringify({ from: phone, message }),
      });
      els.testerResult.textContent = JSON.stringify(result, null, 2);
      showToast(`Resposta gerada: ${result.source || 'n/d'}`, 'success');
      await loadNotifications();
      await loadOverview();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function runDebug(endpoint) {
    const phone = normalizePhone(els.testerPhone.value);
    if (!phone) {
      showToast('Informe um telefone para debug.', 'warning');
      return;
    }

    try {
      const result = await apiFetch(endpoint);
      els.testerResult.textContent = JSON.stringify(result, null, 2);
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function apiFetch(endpoint, options = {}) {
    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };
    const token = localStorage.getItem('lab1633_admin_token');
    if (token) headers['x-admin-token'] = token;
    if (options.body) headers['Content-Type'] = 'application/json';

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      const message = typeof data === 'object' ? data.error || data.erro || 'Erro na requisição.' : data;
      throw new Error(message);
    }

    return data;
  }

  function normalizePhone(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR');
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    els.toastHost.appendChild(toast);
    setTimeout(() => toast.remove(), 4200);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }
})();
