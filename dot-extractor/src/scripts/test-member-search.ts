import { createDotApi, closeApi } from '../sdk/dotClient';
import * as fs from 'fs';

async function testMemberSearch() {
  console.log('🔍 Testing member search API...\n');
  
  const api = await createDotApi('dot-storage.json');
  
  try {
    // Test different payload variations
    const tests = [
      {
        name: 'Minimal - member ID only',
        payload: {
          memberId: '916797559',
          responseTypeIndicator: 'XML'
        }
      },
      {
        name: 'Full payload with all fields',
        payload: {
          memberId: '916797559',
          firstName: 'Maurice',
          lastName: 'Berend',
          birthDate: '12/16/1978',
          responseTypeIndicator: 'XML'
        }
      },
      {
        name: 'Without responseTypeIndicator',
        payload: {
          memberId: '916797559',
          firstName: '',
          lastName: '',
          birthDate: ''
        }
      }
    ];
    
    for (const test of tests) {
      console.log(`\nTest: ${test.name}`);
      console.log('Payload:', JSON.stringify(test.payload, null, 2));
      
      try {
        const response = await api.post('/api/dot-gateway/v02/memberdetail/search', {
          data: test.payload
        });
        
        console.log('Response status:', response.status());
        
        if (!response.ok()) {
          const text = await response.text();
          console.log('Error response:', text);
        } else {
          const data = await response.json();
          console.log('✅ Success!');
          
          // Save successful response
          fs.writeFileSync('member-search-response.json', JSON.stringify(data, null, 2));
          console.log('💾 Response saved to member-search-response.json');
          
          // Show summary
          if (data.subscribers && data.subscribers[0]) {
            const sub = data.subscribers[0];
            console.log(`Found: ${sub.subscriberFirstName} ${sub.subscriberLastName}`);
            console.log(`Member ID: ${sub.alternateId || sub.memberId}`);
            console.log(`Dependents: ${sub.dependents?.length || 0}`);
          }
          
          // Stop on first success
          break;
        }
      } catch (error) {
        console.log('Request error:', error);
      }
      
      console.log('=' .repeat(60));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closeApi(api);
  }
}

testMemberSearch().catch(console.error);