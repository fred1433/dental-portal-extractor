// Check if running on Render or locally and detect location
async function checkLocation() {
  const isRender = process.env.RENDER === 'true' || process.env.RENDER_SERVICE_NAME;

  if (isRender) {
    console.log('🚀 Running on Render platform');
    return { isUS: true, platform: 'render' };
  } else {
    console.log('💻 Running locally - checking actual location...');

    try {
      // Use ip-api.com for location detection (free, no API key needed, more reliable)
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://ip-api.com/json/', { timeout: 3000 });
      const data = await response.json();

      const isUS = data.countryCode === 'US';
      console.log(`📍 Location detected: ${data.country || 'Unknown'} (${data.countryCode || 'Unknown'})`);

      if (!isUS) {
        console.log('⚠️  WARNING: You are not in the US!');
        console.log('   DOT portal requires a US VPN connection to work.');
        console.log('   Please connect to a US VPN server and restart the application.');
      }

      return {
        isUS,
        platform: 'local',
        country: data.country || 'Unknown',
        city: data.city || 'Unknown'
      };
    } catch (error) {
      console.log('⚠️ Could not detect location, assuming non-US');
      // If we can't detect, assume NOT in US (safer assumption)
      return { isUS: false, platform: 'local', error: 'detection-failed' };
    }
  }
}

module.exports = checkLocation;