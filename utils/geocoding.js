/**
 * Geocoding utilities using OpenStreetMap Nominatim
 * No API key required - free and open source
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

/**
 * Geocode an address to coordinates
 * @param {string} address - The address to geocode
 * @returns {Promise<Object|null>} { lat, lng } or null if not found
 */
async function geocodeAddress(address) {
    try {
        const response = await fetch(
            `${NOMINATIM_URL}/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
            {
                headers: {
                    'User-Agent': 'LivestockMarketplace/1.0'
                }
            }
        );
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }
        
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

/**
 * Reverse geocode coordinates to address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>} Address details or null
 */
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(
            `${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lng}&format=json`,
            {
                headers: {
                    'User-Agent': 'LivestockMarketplace/1.0'
                }
            }
        );
        
        const data = await response.json();
        
        if (data && data.display_name) {
            return {
                display_name: data.display_name,
                address: data.address || {}
            };
        }
        
        return null;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - First point latitude
 * @param {number} lon1 - First point longitude
 * @param {number} lat2 - Second point latitude
 * @param {number} lon2 - Second point longitude
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    
    const toRad = (deg) => deg * (Math.PI / 180);
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
}

/**
 * Find agents within a certain radius of a location
 * @param {Object} User - Sequelize User model
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {Promise<Array>} Array of agents with distance
 */
async function findNearbyAgents(User, lat, lng, radiusKm = 10) {
    try {
        // Get all online agents with location data
        const agents = await User.findAll({
            where: {
                role: 'Agent',
                is_online: true,
                current_lat: { [require('sequelize').Op.ne]: null },
                current_lng: { [require('sequelize').Op.ne]: null }
            },
            attributes: ['user_id', 'email', 'phone', 'current_lat', 'current_lng', 'max_delivery_radius_km']
        });
        
        // Calculate distance for each agent and filter by radius
        const nearbyAgents = agents
            .map(agent => {
                const distance = calculateDistance(
                    lat, lng,
                    parseFloat(agent.current_lat),
                    parseFloat(agent.current_lng)
                );
                return {
                    ...agent.toJSON(),
                    distance_km: Math.round(distance * 100) / 100
                };
            })
            .filter(agent => agent.distance_km <= radiusKm)
            .sort((a, b) => a.distance_km - b.distance_km);
        
        return nearbyAgents;
    } catch (error) {
        console.error('Error finding nearby agents:', error);
        return [];
    }
}

/**
 * Check if a location is within an agent's delivery radius
 * @param {Object} agent - Agent object with current_lat, current_lng, max_delivery_radius_km
 * @param {number} lat - Target latitude
 * @param {number} lng - Target longitude
 * @returns {boolean} Whether the location is within range
 */
function isWithinDeliveryRadius(agent, lat, lng) {
    const distance = calculateDistance(
        parseFloat(agent.current_lat),
        parseFloat(agent.current_lng),
        lat,
        lng
    );
    return distance <= parseFloat(agent.max_delivery_radius_km || 10);
}

module.exports = {
    geocodeAddress,
    reverseGeocode,
    calculateDistance,
    findNearbyAgents,
    isWithinDeliveryRadius
};
