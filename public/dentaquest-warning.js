/**
 * Handle DentaQuest unsupported state warnings
 */
(function() {
  // Listen for unsupported state events
  window.addEventListener('dentaquest:unsupported-state', function(event) {
    const { state, plan, message } = event.detail;

    // Check if warning banner already exists
    let warningBanner = document.getElementById('dentaquest-warning');

    if (!warningBanner) {
      // Create warning banner
      warningBanner = document.createElement('div');
      warningBanner.id = 'dentaquest-warning';
      warningBanner.className = 'alert alert-warning dentaquest-warning';
      warningBanner.style.cssText = `
        background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
        border: 2px solid #ffc107;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideDown 0.5s ease-out;
      `;

      // Find form container or body
      const container = document.querySelector('.form-container') ||
                       document.querySelector('main') ||
                       document.body;

      // Insert at the top
      container.insertBefore(warningBanner, container.firstChild);
    }

    // Update warning content
    warningBanner.innerHTML = `
      <div style="display: flex; align-items: start; gap: 15px;">
        <div style="font-size: 2em;">⚠️</div>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 1.2em;">
            📋 ${state} Coverage Catalog Not Yet Added
          </h3>
          <p style="margin: 0 0 10px 0; color: #856404;">
            <strong>Plan:</strong> ${plan}<br>
            <strong>Status:</strong> Coverage details for ${state} not yet collected<br>
            <strong style="color: #28a745;">✓ This is a quick fix!</strong> The dev team just needs to add the ${state} coverage rules (1-2 hours of work).
          </p>
          <div style="margin-top: 15px; padding: 12px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px;">
            <strong style="color: #155724;">🚀 How to fix this:</strong>
            <ol style="margin: 10px 0 0 20px; padding: 0; color: #155724;">
              <li>Notify the dev team about ${state} plans</li>
              <li>They'll add the coverage catalog (JSON file)</li>
              <li>You'll have full ${state} support immediately</li>
            </ol>
            <p style="margin: 10px 0 0 0; color: #155724;">
              <strong>Action needed:</strong> Report this ${state} plan to the development team
            </p>
          </div>
          <details style="margin-top: 15px;">
            <summary style="cursor: pointer; color: #0056b3; text-decoration: underline;">
              What works right now?
            </summary>
            <div style="margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.5); border-radius: 4px;">
              <p style="margin: 5px 0;">
                ✓ Patient information extraction<br>
                ✓ Claims history<br>
                ✓ Service dates<br>
                ✗ Coverage percentages (shows "Unknown")<br>
                ✗ Procedure limitations<br>
                ✗ Waiting periods
              </p>
            </div>
          </details>
        </div>
        <button onclick="this.parentElement.parentElement.style.display='none'"
                style="background: transparent; border: none; font-size: 1.5em; cursor: pointer; padding: 0;">
          ×
        </button>
      </div>
    `;

    // Add animation
    if (!document.getElementById('dentaquest-warning-styles')) {
      const style = document.createElement('style');
      style.id = 'dentaquest-warning-styles';
      style.textContent = `
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .dentaquest-warning {
          position: relative;
        }

        .dentaquest-warning::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 5px;
          height: 100%;
          background: #ffc107;
          border-radius: 8px 0 0 8px;
        }
      `;
      document.head.appendChild(style);
    }

    // Also log to console for debugging
    console.warn('DentaQuest Warning:', {
      state,
      plan,
      message,
      timestamp: new Date().toISOString()
    });
  });

  // Auto-check on page load if data exists
  window.addEventListener('DOMContentLoaded', function() {
    if (window.dentaquestWarning) {
      window.dispatchEvent(new CustomEvent('dentaquest:unsupported-state', {
        detail: window.dentaquestWarning
      }));
    }
  });
})();