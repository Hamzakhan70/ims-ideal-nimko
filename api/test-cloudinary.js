// Simple test script to verify Cloudinary configuration
import dotenv from 'dotenv';
import {v2 as cloudinary} from 'cloudinary';

// Load environment variables
dotenv.config();

console.log('\n🔍 Testing Cloudinary Configuration...\n');

// Check environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('Environment Variables:');
console.log('  CLOUDINARY_CLOUD_NAME:', cloudName || '❌ MISSING');
console.log('  CLOUDINARY_API_KEY:', apiKey ? `${
    apiKey.substring(0, 4)
}...` : '❌ MISSING');
console.log('  CLOUDINARY_API_SECRET:', apiSecret ? `${
    apiSecret.substring(0, 4)
}...` : '❌ MISSING');
console.log('');

if (! cloudName || ! apiKey || ! apiSecret) {
    console.error('❌ ERROR: Missing required environment variables!');
    console.error('\nPlease add these to your .env file:');
    console.error('  CLOUDINARY_CLOUD_NAME=your_cloud_name');
    console.error('  CLOUDINARY_API_KEY=your_api_key');
    console.error('  CLOUDINARY_API_SECRET=your_api_secret');
    console.error('\nGet these from: https://console.cloudinary.com/');
    process.exit(1);
}

// Configure Cloudinary
cloudinary.config({cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret});

// Test connection
console.log('Testing Cloudinary connection...');
try {
    const result = await cloudinary.api.ping();
    console.log('✅ SUCCESS! Cloudinary is configured correctly.');
    console.log('   Status:', result.status);
    console.log('\n🎉 You can now upload images!');
} catch (error) {
    console.error('❌ ERROR: Failed to connect to Cloudinary');
    console.error('   Error:', error.message);

    if (error.http_code === 401) {
        console.error('\n💡 This usually means:');
        console.error('   - Your API Key is incorrect');
        console.error('   - Your API Secret is incorrect');
        console.error('   - Double-check your credentials in Cloudinary console');
    } else if (error.http_code === 404) {
        console.error('\n💡 This usually means:');
        console.error('   - Your Cloud Name is incorrect');
        console.error('   - Check your Cloudinary dashboard');
    }

    process.exit(1);
}
