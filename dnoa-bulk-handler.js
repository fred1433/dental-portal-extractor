// Simple DNOA Bulk Handler - No over-engineering!
const DNOAService = require('./dnoa-service');

class DNOABulkHandler {
  constructor() {
    this.service = null;
    this.results = [];
    this.errors = [];
  }

  // Parse textarea input into patient list
  parseInput(inputText) {
    const lines = inputText.trim().split('\n');
    const patients = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Support multiple delimiters: comma, tab, semicolon
      const parts = trimmed.split(/[,\t;]+/).map(p => p.trim());

      if (parts.length >= 2) {
        const [subscriberId, dateOfBirth] = parts;

        // Auto-detect date format and normalize
        let normalizedDob = dateOfBirth;
        if (dateOfBirth.includes('/')) {
          // MM/DD/YYYY to YYYY-MM-DD
          const [month, day, year] = dateOfBirth.split('/');
          normalizedDob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        patients.push({
          subscriberId,
          dateOfBirth: normalizedDob,
          firstName: '',  // DNOA doesn't need names
          lastName: ''
        });
      }
    }

    return patients;
  }

  async processBulk(patients, onProgress) {
    // Initialize service once (login, get token)
    this.service = new DNOAService();
    await this.service.initialize(true, onProgress);

    const total = patients.length;
    let processed = 0;

    for (const patient of patients) {
      processed++;
      const patientId = patient.subscriberId;

      try {
        onProgress(`[${processed}/${total}] Extracting Member ID: ${patientId}...`);

        // Use existing extraction method
        const data = await this.service.extractPatientData(patient, onProgress);

        this.results.push({
          success: true,
          patient,
          data
        });

        onProgress(`✅ [${processed}/${total}] Success: ${patientId}`);

      } catch (error) {
        this.errors.push({
          patient,
          error: error.message
        });

        onProgress(`❌ [${processed}/${total}] Failed: ${patientId} - ${error.message}`);
      }

      // Simple delay to avoid rate limiting (adjustable)
      if (processed < total) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    // Clean up
    await this.service.close();

    return {
      total,
      successful: this.results.length,
      failed: this.errors.length,
      results: this.results,
      errors: this.errors
    };
  }

  // Export results to different formats
  exportJSON() {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length + this.errors.length,
        successful: this.results.length,
        failed: this.errors.length
      },
      results: this.results,
      errors: this.errors
    }, null, 2);
  }

  exportCSV() {
    const rows = ['MemberID,DateOfBirth,Status,PlanName,Deductible,Maximum'];

    for (const result of this.results) {
      const s = result.data.summary;
      rows.push([
        result.patient.subscriberId,
        result.patient.dateOfBirth,
        'Success',
        s.planName || '',
        s.deductible?.remaining || '',
        s.annualMaximum?.remaining || ''
      ].join(','));
    }

    for (const error of this.errors) {
      rows.push([
        error.patient.subscriberId,
        error.patient.dateOfBirth,
        'Failed',
        '',
        '',
        ''
      ].join(','));
    }

    return rows.join('\n');
  }
}

module.exports = DNOABulkHandler;