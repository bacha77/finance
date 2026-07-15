import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing Supabase credentials in .env file.");
    process.exit(1);
}

if (!GOOGLE_MAPS_API_KEY) {
    console.error("❌ Missing Google Maps API Key in .env file.");
    console.error("Please add VITE_GOOGLE_MAPS_API_KEY=\"your_key\" to your .env file.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const query = process.argv[2] || 'Churches in Columbus OH';

async function extractEmail(url) {
    if (!url) return '';
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        clearTimeout(timeoutId);
        if (!res.ok) return '';
        const text = await res.text();
        const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (match && !match[0].match(/\.(png|jpg|jpeg|gif|css|js|webp|svg)$/i)) {
            return match[0];
        }
        return '';
    } catch (e) {
        return '';
    }
}


async function fetchLeads(searchQuery) {
    console.log(`\n🔍 Searching for: "${searchQuery}"...`);
    
    try {
        // Step 1: Text Search to find places
        const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_MAPS_API_KEY}`;
        const searchResponse = await fetch(textSearchUrl);
        const searchData = await searchResponse.json();

        if (searchData.status !== 'OK') {
            console.error(`❌ Google API Error: ${searchData.status} - ${searchData.error_message || ''}`);
            return;
        }

        const places = searchData.results;
        console.log(`✅ Found ${places.length} potential leads! Extracting details...\n`);

        let insertedCount = 0;

        // Step 2: Get Place Details for phone numbers (Text Search doesn't return phone numbers)
        for (const place of places) {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,website,formatted_address&key=${GOOGLE_MAPS_API_KEY}`;
            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();

            if (detailsData.status === 'OK') {
                const details = detailsData.result;
                
                const churchName = details.name;
                const phone = details.formatted_phone_number || '';
                const website = details.website || '';
                let email = ''; 
                if (website) {
                    email = await extractEmail(website);
                }
                
                console.log(`➡️  ${churchName}`);
                if (phone) console.log(`   Phone: ${phone}`);
                if (website) console.log(`   Website: ${website}`);
                if (email) console.log(`   Email: ${email}`);
                
                // Insert into Supabase CRM
                const { error } = await supabase.from('marketing_leads').insert({
                    church_name: churchName,
                    phone: phone,
                    email: email, 
                    contact_name: 'Lead from ' + churchName,
                    status: 'New',
                    source: 'Google Maps Scraper',
                    estimated_value: 0.00 
                });

                if (error) {
                    console.error(`   ❌ Failed to insert: ${error.message}`);
                } else {
                    console.log(`   ✅ Added to CRM!`);
                    insertedCount++;
                }
                
                console.log('---');
                
                // Small delay to avoid hitting rate limits too quickly
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        console.log(`\n🎉 Success! Added ${insertedCount} new leads to your CRM.`);

    } catch (err) {
        console.error("❌ An unexpected error occurred:", err.message);
    }
}

fetchLeads(query);
