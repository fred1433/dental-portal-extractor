// TURBO DNOA Bulk Handler - Speed optimized!
const DNOAService = require('./dnoa-service');

class DNOABulkHandler {
  constructor() {
    this.service = null;
    this.results = [];
    this.errors = [];
    this.consecutiveErrors = 0;
    this.maxWorkers = 2; // Start with 2 parallel workers
  }

  // Parse textarea input into patient list
  parseInput(inputText) {
    const lines = inputText.trim().split('\n');
    const patients = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('...')) continue;

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

  async processOnePatient(patient, patientNum, total, onProgress, skipLoginCheck) {
    const patientId = patient.subscriberId;

    try {
      onProgress(`[${patientNum}/${total}] Extracting Member ID: ${patientId}...`);

      // Use optimized extraction (skip login check after first patient)
      const data = await this.service.extractPatientData(patient, onProgress, skipLoginCheck);

      this.results.push({
        success: true,
        patient,
        data
      });

      onProgress(`✅ [${patientNum}/${total}] Success: ${patientId}`);
      this.consecutiveErrors = 0; // Reset on success
      return { success: true };

    } catch (error) {
      this.errors.push({
        patient,
        error: error.message
      });

      onProgress(`❌ [${patientNum}/${total}] Failed: ${patientId} - ${error.message}`);
      this.consecutiveErrors++;

      // Check if it's a 401/403 and we need to refresh
      if (error.message.includes('401') || error.message.includes('403')) {
        return { success: false, needsAuth: true };
      }

      return { success: false };
    }
  }

  async processBulk(patients, onProgress) {
    // Initialize service once (login, get token)
    this.service = new DNOAService();
    await this.service.initialize(true, onProgress);

    const total = patients.length;
    const startTime = Date.now(); // Start timing
    let processed = 0;
    let workerPromises = [];
    let patientIndex = 0;
    let skipLoginCheck = false; // Will be true after first successful patient

    onProgress(`🚀 Starting TURBO extraction for ${total} patients with ${this.maxWorkers} workers!`);

    // Process patients with worker pool
    while (patientIndex < total || workerPromises.length > 0) {
      // Fill up worker pool
      while (workerPromises.length < this.maxWorkers && patientIndex < total) {
        const patient = patients[patientIndex];
        const currentIndex = patientIndex + 1;
        patientIndex++;

        // Add smart delays to avoid synchronized requests
        // Special handling for startup to avoid collisions
        let delay = 0;
        if (currentIndex === 1) {
          // First patient: no delay
          delay = 0;
        } else if (currentIndex === 2) {
          // Second patient: 4 second delay to avoid collision
          delay = 4000;
        } else {
          // Rest: small random delay
          delay = Math.random() * 1000 + 500;
        }

        const workerPromise = new Promise(async (resolve) => {
          if (delay > 0) {
            await new Promise(r => setTimeout(r, delay));
          }

          const result = await this.processOnePatient(
            patient,
            currentIndex,
            total,
            onProgress,
            skipLoginCheck
          );

          // After first successful patient, skip login checks
          if (result.success && !skipLoginCheck) {
            skipLoginCheck = true;
            onProgress('⚡ Login verified - skipping future checks for speed!');
          }

          // If auth failed, reset skipLoginCheck
          if (result.needsAuth) {
            skipLoginCheck = false;
            onProgress('🔐 Session expired - will re-authenticate');
          }

          processed++;
          resolve(result);
        });

        workerPromises.push(workerPromise);
      }

      // Wait for at least one worker to finish
      if (workerPromises.length > 0) {
        const finishedIndex = await Promise.race(
          workerPromises.map((p, i) => p.then(() => i))
        );

        const result = await workerPromises[finishedIndex];
        workerPromises.splice(finishedIndex, 1);

        // Adaptive slowdown if too many errors
        if (this.consecutiveErrors >= 3 && this.maxWorkers > 1) {
          this.maxWorkers = 1;
          onProgress('⚠️ Multiple errors detected - switching to single worker mode');
        }

        // If we see rate limiting, add extra delay
        if (result.error && result.error.includes('429')) {
          onProgress('⏸️ Rate limit detected - adding 2 second cooldown');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Progress update
      if (processed % 10 === 0) {
        const rate = processed / ((Date.now() - startTime) / 1000 / 60);
        const eta = (total - processed) / rate;
        onProgress(`📊 Progress: ${processed}/${total} (${Math.round(rate)} patients/min, ETA: ${Math.round(eta)}min)`);
      }
    }

    // Clean up
    await this.service.close();

    const duration = (Date.now() - startTime) / 1000;
    const rate = total / (duration / 60);

    onProgress(`\n🏁 Completed ${total} patients in ${Math.round(duration)}s (${Math.round(rate)} patients/min)`);
    onProgress(`✅ Successful: ${this.results.length} | ❌ Failed: ${this.errors.length}`);

    return {
      total,
      successful: this.results.length,
      failed: this.errors.length,
      results: this.results,
      errors: this.errors,
      performance: {
        durationSeconds: Math.round(duration),
        patientsPerMinute: Math.round(rate)
      }
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