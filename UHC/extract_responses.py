#!/usr/bin/env python3
import json
import base64
import gzip

def extract_api_responses():
    with open('HAR-for-jace.json', 'r') as f:
        har_data = json.load(f)

    print("=== All API Endpoints and Response Analysis ===\n")

    api_calls = []

    for entry in har_data['log']['entries']:
        url = entry['request']['url']
        method = entry['request']['method']

        # Focus on UHC API calls
        if '/apps/dental/' in url:
            endpoint = url.split('/apps/dental/')[1].split('?')[0]

            response_info = {
                'endpoint': endpoint,
                'method': method,
                'url': url,
                'status': entry['response']['status'],
                'has_response': False,
                'response_size': 0,
                'response_data': None
            }

            # Check response content
            if 'content' in entry['response']:
                content = entry['response']['content']

                # Check if there's text content
                if 'text' in content and content['text']:
                    response_info['has_response'] = True
                    response_info['response_size'] = len(content['text'])

                    # Check if it's encoded (base64)
                    if content.get('encoding') == 'base64':
                        try:
                            decoded = base64.b64decode(content['text'])
                            # Try to decompress if it's gzipped
                            try:
                                decompressed = gzip.decompress(decoded).decode('utf-8')
                                response_info['response_data'] = decompressed
                            except:
                                response_info['response_data'] = decoded.decode('utf-8', errors='ignore')
                        except:
                            response_info['response_data'] = content['text']
                    else:
                        response_info['response_data'] = content['text']

                # Check response size
                if 'size' in content:
                    response_info['actual_size'] = content['size']

            api_calls.append(response_info)

    # Sort by importance
    key_endpoints = ['member', 'eligsummary', 'benefitsummary', 'claimsummary', 'treatmentplan', 'utilizationHistory']

    # Group by endpoint
    by_endpoint = {}
    for call in api_calls:
        ep = call['endpoint']
        if ep not in by_endpoint:
            by_endpoint[ep] = []
        by_endpoint[ep].append(call)

    print(f"Total API calls found: {len(api_calls)}")
    print(f"Unique endpoints: {len(by_endpoint)}")
    print()

    for endpoint in key_endpoints:
        if endpoint in by_endpoint:
            calls = by_endpoint[endpoint]
            print(f"📍 {endpoint.upper()}")
            print(f"   Calls: {len(calls)}")

            for call in calls:
                print(f"   Status: {call['status']}")
                print(f"   Method: {call['method']}")
                if call['has_response']:
                    print(f"   Response size: {call['response_size']} chars")

                    if call['response_data']:
                        # Try to parse as JSON
                        try:
                            json_data = json.loads(call['response_data'])
                            print(f"   Response type: JSON")

                            # Show structure
                            if isinstance(json_data, list):
                                print(f"   Data: Array with {len(json_data)} items")
                                if json_data and isinstance(json_data[0], dict):
                                    print(f"   Keys in first item: {list(json_data[0].keys())}")
                            elif isinstance(json_data, dict):
                                print(f"   Data: Object with keys: {list(json_data.keys())}")

                            # Show preview
                            preview = json.dumps(json_data, indent=2)
                            if len(preview) > 800:
                                print(f"   Preview (first 800 chars):")
                                print(f"   {preview[:800]}...")
                            else:
                                print(f"   Full response:")
                                print(f"   {preview}")

                        except json.JSONDecodeError:
                            print(f"   Response type: Non-JSON")
                            preview = call['response_data'][:300]
                            print(f"   Preview: {preview}...")

                else:
                    print(f"   Response: No content or empty")

                print()

    # Show summary
    print("\n=== ENDPOINT ANALYSIS SUMMARY ===")
    print("\n🟢 Endpoints we currently use:")
    current = ['member', 'eligsummary', 'benefitsummary']
    for ep in current:
        if ep in by_endpoint:
            calls = by_endpoint[ep]
            has_data = any(call['has_response'] for call in calls)
            print(f"   ✅ {ep} - {'Returns data' if has_data else 'No data'}")

    print("\n🔴 Endpoints we DON'T use (potentially missing data):")
    missing = ['claimsummary', 'treatmentplan', 'utilizationHistory']
    for ep in missing:
        if ep in by_endpoint:
            calls = by_endpoint[ep]
            has_data = any(call['has_response'] for call in calls)
            print(f"   ❌ {ep} - {'Returns data' if has_data else 'No data'}")

    # Show other endpoints
    other_endpoints = set(by_endpoint.keys()) - set(key_endpoints)
    if other_endpoints:
        print(f"\n🔵 Other endpoints:")
        for ep in other_endpoints:
            calls = by_endpoint[ep]
            has_data = any(call['has_response'] for call in calls)
            print(f"   ℹ️  {ep} - {'Returns data' if has_data else 'No data'}")

if __name__ == "__main__":
    extract_api_responses()