/**
 * VPN Location Checker
 *
 * IMPORTANT: This utility checks if the user is connected to a US VPN.
 * Many dental insurance portals (DOT, MetLife, etc.) block access from outside the US.
 *
 * For developers in Brazil, Pakistan, or elsewhere:
 * - ALWAYS activate your US VPN before testing
 * - The app will show a warning if you forget
 *
 * @returns {Object} Location info and US status
 */

async function checkLocation() {
  const isRender = process.env.RENDER === 'true' || process.env.RENDER_SERVICE_NAME;

  if (isRender) {
    console.log('🚀 Running on Render platform');
    return { isUS: true, platform: 'render' };
  } else {
    console.log('💻 Running locally - checking actual location...');

    try {
      // Use ip-api.com for location detection (free, no API key needed)
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://ip-api.com/json/', { timeout: 3000 });
      const data = await response.json();

      const isUS = data.countryCode === 'US';
      console.log(`📍 Location detected: ${data.country || 'Unknown'} (${data.countryCode || 'Unknown'})`);

      if (!isUS) {
        console.log('\n' + '='.repeat(60));
        console.log('⚠️  WARNING: YOU ARE NOT CONNECTED TO A US VPN!');
        console.log('='.repeat(60));
        console.log('');
        console.log('Most dental portals (DOT, MetLife, Cigna, etc.) require US IP addresses.');
        console.log('');
        console.log('👉 ACTION REQUIRED:');
        console.log('   1. Connect to your US VPN server');
        console.log('   2. Restart this application');
        console.log('');
        console.log(`Your current location: ${data.city}, ${data.country}`);
        console.log('='.repeat(60) + '\n');
      } else {
        console.log('✅ US location confirmed - portals should work!');
      }

      return {
        isUS,
        platform: 'local',
        country: data.country || 'Unknown',
        city: data.city || 'Unknown'
      };
    } catch (error) {
      console.log('⚠️ Could not detect location, assuming non-US');
      console.log('   Please ensure your VPN is connected to the US');
      // If we can't detect, assume NOT in US (safer assumption)
      return { isUS: false, platform: 'local', error: 'detection-failed' };
    }
  }
}

module.exports = checkLocation;