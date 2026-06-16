window.openModal = function(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.setProperty('display', 'flex', 'important');
        el.classList.add('open');
    }
};

window.closeModal = function(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.setProperty('display', 'none', 'important');
        el.classList.remove('open');
    }
};

let currentModelDsrFile = null;
let currentModelDsrName = '';
let currentDistrict = '';
let selectedTargetProjectId = null;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function modelDsrList(data) {
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

function buildModelDsrSections(district, sourceFileName) {
  const chapters = [
    'Introduction',
    'Overview of Mining Activity',
    'General Profile of the District',
    'Geology and Mineral Wealth',
    'Drainage and River System',
    'Mineral Potential',
    'Replenishment Study',
    'Environmental Management Plan',
    'Cluster and Transportation Details',
    'Recommendations'
  ];
  const annexures = [
    'Annexure A - Mining Lease Details',
    'Annexure B - Production Details',
    'Annexure C - Replenishment Data',
    'Annexure D - Environmental Safeguards',
    'Annexure E - Public Consultation Records'
  ];

  const context = {
    district: district || null,
    sourceFileName: sourceFileName || null,
    source: 'legacy-model-dsr'
  };

  return [
    ...chapters.map((name, index) => ({
      sectionName: `Chapter ${index + 1} - ${name}`,
      contentType: 'TEXT',
      configuration: { ...context, kind: 'chapter', chapterNo: index + 1 }
    })),
    ...annexures.map((name, index) => ({
      sectionName: name,
      contentType: 'TABLE',
      configuration: { ...context, kind: 'annexure', annexureNo: index + 1 }
    }))
  ];
}

function readModelDsrForm(requireDistrict) {
  const districtSelect = document.getElementById('model-dsr-district');
  const nameInput = document.getElementById('model-dsr-name');
  const fileInput = document.getElementById('model-dsr-file');

  currentDistrict = districtSelect?.value || '';
  currentModelDsrName = (nameInput?.value || '').trim();
  currentModelDsrFile = fileInput?.files?.[0] || null;

  if (requireDistrict && !currentDistrict) {
    alert('Please select a district.');
    return null;
  }

  if (!currentModelDsrName) {
    currentModelDsrName = currentDistrict ? `Model DSR - ${currentDistrict}` : 'Model DSR';
  }

  return {
    district: currentDistrict,
    title: currentModelDsrName,
    sourceFileName: currentModelDsrFile?.name || ''
  };
}

async function saveModelDsrTemplate(options = {}) {
  const form = readModelDsrForm(Boolean(options.requireDistrict));
  if (!form) return null;

  const payload = {
    title: form.title,
    description: `Model DSR template${form.district ? ` for ${form.district}` : ''}${form.sourceFileName ? ` (${form.sourceFileName})` : ''}`,
    district: form.district,
    sourceFileName: form.sourceFileName,
    sections: buildModelDsrSections(form.district, form.sourceFileName)
  };

  try {
    return await apiFetch('/model-dsrs', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (err) {
    if (String(err.message || '').toLowerCase().includes('already exists')) {
      payload.title = `${payload.title} - ${new Date().toLocaleString()}`;
      return apiFetch('/model-dsrs', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
    throw err;
  }
}

window.fetchModelDsrs = async function fetchModelDsrs() {
  try {
    const data = await apiFetch('/model-dsrs');
    renderModelDsrTable(modelDsrList(data));
  } catch (err) {
    console.error(err);
    const tbody = document.querySelector('#view-model-dsr tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--red);">${escapeHtml(err.message || 'Failed to fetch Model DSRs')}</td></tr>`;
    }
  }
};

function renderModelDsrTable(templates) {
  const tbody = document.querySelector('#view-model-dsr tbody');
  if (!tbody) return;

  if (!templates.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No Model DSRs found.</td></tr>';
    return;
  }

  tbody.innerHTML = templates.map((template) => {
    const status = String(template.status || 'DRAFT');
    const sectionCount = Array.isArray(template.sections) ? template.sections.length : 0;
    const statusStyle = status === 'PUBLISHED'
      ? 'background:#dcfce7; color:#166534;'
      : status === 'ARCHIVED'
        ? 'background:#fee2e2; color:#991b1b;'
        : 'background:#e2e8f0; color:#475569;';

    return `
      <tr style="border-bottom: 1px solid var(--border-light);">
        <td style="padding: 12px;"><strong>${escapeHtml(template.title)}</strong><div style="font-size:11px;color:#888;">v${escapeHtml(template.version || 1)}</div></td>
        <td style="padding: 12px;"><span class="badge" style="${statusStyle}">${escapeHtml(status)}</span></td>
        <td style="padding: 12px;">${sectionCount}</td>
        <td style="padding: 12px;">${escapeHtml(template.createdBy || 'Admin')}</td>
        <td style="padding: 12px;">${template.createdAt ? new Date(template.createdAt).toLocaleDateString() : '-'}</td>
        <td style="padding: 12px; display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn btn-outline" style="padding: 4px 10px; font-size: 12px;" onclick="viewModelDsr('${template.id}')">View</button>
          ${status === 'DRAFT' ? `<button class="btn btn-saffron" style="padding: 4px 10px; font-size: 12px;" onclick="publishModelDsr('${template.id}')">Publish</button>` : ''}
          <button class="btn btn-outline" style="padding: 4px 10px; font-size: 12px;" onclick="deleteModelDsr('${template.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.uploadModelDsr = async function uploadModelDsr() {
  const form = readModelDsrForm(true);
  if (!form) return;

  const districtLabel = document.getElementById('mdsr-target-district-label');
  if (districtLabel) districtLabel.textContent = form.district;

  openModal('modal-mdsr-target');
  await fetchTargetProjects(form.district);
};

async function fetchTargetProjects(district) {
  const listEl = document.getElementById('mdsr-target-projects-list');
  const nextBtn = document.getElementById('btn-mdsr-target-next');
  if (!listEl) return;

  listEl.innerHTML = '<div style="padding: 12px; color: var(--text-mid);">Loading projects...</div>';
  if (nextBtn) nextBtn.disabled = true;
  selectedTargetProjectId = null;

  try {
    const data = await apiFetch('/projects');
    const projects = Array.isArray(data?.data) ? data.data : data;
    const filtered = (projects || []).filter((project) => {
        const projDistrict = String(project.district || '').trim().toLowerCase();
        const targetDistrict = String(district || '').trim().toLowerCase();
        const matchesDistrict = projDistrict === targetDistrict;
        const projStatus = String(project.status || '').trim().toUpperCase().replace(/_/g, ' ');
        const validStatuses = ['IN PROGRESS', 'ACTIVE', 'DRAFT'];
        return matchesDistrict && validStatuses.includes(projStatus);
      });

    if (!filtered.length) {
      listEl.innerHTML = `<div style="padding: 12px; color: var(--text-mid); background: #f8fafc; border-radius: 4px;">No ongoing projects found for ${escapeHtml(district)}. Please create a project first.</div>`;
      return;
    }

    listEl.innerHTML = filtered.map((project) => {
      const projectName = project.projectName || project.title || 'DSR Project';
      return `
        <label style="display:flex; align-items:center; gap:12px; padding: 12px; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">
          <input type="radio" name="mdsr-target-project" value="${escapeHtml(project.id)}" onchange="selectTargetProject('${String(project.id).replace(/'/g, "\\'")}', '${String(projectName).replace(/'/g, "\\'")}')" style="width: 16px; height: 16px;">
          <div style="flex: 1;">
            <div style="font-weight: 600;">${escapeHtml(projectName)}</div>
            <div style="font-size: 12px; color: var(--text-soft);">Status: ${escapeHtml(project.status || 'DRAFT')} &bull; Phase: ${escapeHtml(project.phaseNo || project.phase || 1)}</div>
          </div>
        </label>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<div style="padding: 12px; color: var(--red);">Error loading projects: ${escapeHtml(err.message || 'Unable to load projects')}</div>`;
  }
}

window.selectTargetProject = function selectTargetProject(id, name) {
  selectedTargetProjectId = id;
  const label = document.getElementById('mdsr-target-project-name');
  const nextBtn = document.getElementById('btn-mdsr-target-next');
  if (label) label.textContent = name;
  if (nextBtn) nextBtn.disabled = false;
};

function showImportPreview() {
  if (!selectedTargetProjectId) return;
  closeModal('modal-mdsr-target');
  openModal('modal-mdsr-preview');
}

window.executeImport = async function executeImport() {
  if (!selectedTargetProjectId) {
    alert('Please select a target project.');
    return;
  }

  closeModal('modal-mdsr-preview');
  openModal('modal-mdsr-progress');

  const progressBar = document.getElementById('mdsr-progress-bar');
  const progressText = document.getElementById('mdsr-progress-text');
  const progressTitle = document.getElementById('mdsr-progress-title');

  const steps = [
    { text: 'Saving Model DSR template...', target: 25 },
    { text: 'Preparing chapter and annexure mapping...', target: 50 },
    { text: 'Backing up target project state...', target: 70 },
    { text: 'Importing Model DSR into target project...', target: 95 }
  ];

  let currentProgress = 0;
  for (const step of steps) {
    if (progressTitle) progressTitle.textContent = step.text;
    while (currentProgress < step.target) {
      currentProgress = Math.min(step.target, currentProgress + 6);
      if (progressBar) progressBar.style.width = currentProgress + '%';
      if (progressText) progressText.textContent = currentProgress + '%';
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  try {
    const config = {
      replaceChapters: document.getElementById('mdsr-rule-chapters')?.checked !== false,
      replaceAnnexures: document.getElementById('mdsr-rule-annexures')?.checked !== false,
      keepAttachments: document.getElementById('mdsr-rule-attachments')?.checked !== false,
      backupCurrent: true
    };

    const savedTemplate = await saveModelDsrTemplate({ requireDistrict: true });
    const modelId = savedTemplate?.id || savedTemplate?.data?.id;
    if (!modelId) throw new Error('Model DSR could not be saved.');

    const result = await apiFetch(`/model-dsrs/${modelId}/import`, {
      method: 'POST',
      body: JSON.stringify({ projectId: selectedTargetProjectId, config })
    });

    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.textContent = '100%';
    if (progressTitle) {
      progressTitle.textContent = `Import Complete: ${result.chaptersImported || 0} chapters, ${result.annexuresImported || 0} annexures`;
      progressTitle.style.color = 'var(--green)';
    }

    setTimeout(() => {
      closeModal('modal-mdsr-progress');
      resetModelDsrForm();
      fetchModelDsrs();
      alert('Model DSR successfully imported into the selected project.');
      window.viewProjectId = selectedTargetProjectId;
      if (typeof window.switchProject === 'function') {
        window.switchProject(selectedTargetProjectId);
      } else if (typeof window.showView === 'function') {
        window.showView('project-dashboard');
      }
    }, 900);
  } catch (err) {
    console.error(err);
    if (progressTitle) {
      progressTitle.textContent = 'Import Failed';
      progressTitle.style.color = 'var(--red)';
    }
    if (progressText) progressText.textContent = err.message || 'Unable to import Model DSR';
    setTimeout(() => closeModal('modal-mdsr-progress'), 3000);
  }
};

async function saveOnlyModelDsr() {
  try {
    const savedTemplate = await saveModelDsrTemplate({ requireDistrict: false });
    if (!savedTemplate) return;
    resetModelDsrForm();
    await fetchModelDsrs();
    alert('Model DSR saved successfully.');
  } catch (err) {
    console.error(err);
    alert('Failed to save Model DSR: ' + (err.message || 'Unknown error'));
  }
}

window.publishModelDsr = async function publishModelDsr(id) {
  if (!confirm('Publish this Model DSR? Published templates can be used for DSR generation and import.')) return;
  try {
    await apiFetch(`/model-dsrs/${id}/publish`, { method: 'POST' });
    alert('Model DSR published successfully.');
    fetchModelDsrs();
  } catch (err) {
    console.error(err);
    alert('Failed to publish Model DSR: ' + (err.message || 'Unknown error'));
  }
};

window.viewModelDsr = async function viewModelDsr(id) {
  try {
    const template = await apiFetch(`/model-dsrs/${id}`);
    const titleEl = document.getElementById('mdsr-details-title');
    const bodyEl = document.getElementById('mdsr-details-body');
    const sections = Array.isArray(template.sections) ? template.sections : [];

    if (titleEl) titleEl.textContent = template.title || 'Model DSR';
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
          <span class="badge" style="background:#e2e8f0;color:#475569;">${escapeHtml(template.status || 'DRAFT')}</span>
          <span class="badge" style="background:#f1f5f9;color:#334155;">${sections.length} sections</span>
          <span class="badge" style="background:#f1f5f9;color:#334155;">v${escapeHtml(template.version || 1)}</span>
        </div>
        <div style="color:var(--text-mid); margin-bottom:12px;">${escapeHtml(template.description || 'No description')}</div>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>#</th><th>Section</th><th>Type</th></tr></thead>
            <tbody>
              ${sections.map((section) => `
                <tr>
                  <td style="padding:10px;">${escapeHtml(section.sequence)}</td>
                  <td style="padding:10px;">${escapeHtml(section.sectionName)}</td>
                  <td style="padding:10px;">${escapeHtml(section.contentType)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
    openModal('modal-mdsr-details');
  } catch (err) {
    console.error(err);
    alert('Failed to open Model DSR: ' + (err.message || 'Unknown error'));
  }
};

window.deleteModelDsr = async function deleteModelDsr(id) {
  if (!confirm('Delete this Model DSR? If reports were already generated from it, it will be archived instead.')) return;
  try {
    const result = await apiFetch(`/model-dsrs/${id}`, { method: 'DELETE' });
    alert(result.message || 'Model DSR removed.');
    fetchModelDsrs();
  } catch (err) {
    console.error(err);
    alert('Failed to delete Model DSR: ' + (err.message || 'Unknown error'));
  }
};

function resetModelDsrForm() {
  const nameInput = document.getElementById('model-dsr-name');
  const fileInput = document.getElementById('model-dsr-file');
  const districtSelect = document.getElementById('model-dsr-district');
  if (nameInput) nameInput.value = '';
  if (fileInput) fileInput.value = '';
  if (districtSelect) districtSelect.value = '';
  currentModelDsrFile = null;
  currentModelDsrName = '';
  currentDistrict = '';
  selectedTargetProjectId = null;
}

window.executeRollback = async function executeRollback() {
  const input = document.getElementById('mdsr-rollback-id');
  if (!input) return;
  const projectId = input.value.trim();

  if (!projectId) {
    alert('Please enter a valid Project ID to rollback.');
    return;
  }

  if (!confirm(`Rollback Project ID ${projectId} to its state before the Model DSR import?`)) {
    return;
  }

  try {
    await apiFetch(`/projects/${projectId}/rollback`, {
      method: 'POST'
    });

    alert(`Project ${projectId} has been rolled back successfully.`);
    input.value = '';
  } catch (err) {
    console.error(err);
    alert('Rollback failed: ' + (err.message || 'Unknown error'));
  }
};

const originalShowView = window.showView;
if (typeof originalShowView === 'function') {
  window.showView = function(viewId, param, push) {
    originalShowView(viewId, param, push);
    if (viewId === 'model-dsr') {
      fetchModelDsrs();
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const uploadBtn = document.getElementById('btn-model-dsr-upload');
    if (uploadBtn) uploadBtn.onclick = uploadModelDsr;

    const saveOnlyBtn = document.getElementById('btn-model-dsr-save-only');
    if (saveOnlyBtn) saveOnlyBtn.onclick = saveOnlyModelDsr;

    const targetNextBtn = document.getElementById('btn-mdsr-target-next');
    if (targetNextBtn) targetNextBtn.onclick = showImportPreview;

    const confirmImportBtn = document.getElementById('btn-mdsr-confirm-import');
    if (confirmImportBtn) confirmImportBtn.onclick = executeImport;

    const rollbackBtn = document.getElementById('btn-mdsr-rollback');
    if (rollbackBtn) rollbackBtn.onclick = executeRollback;
  }, 200);
});
