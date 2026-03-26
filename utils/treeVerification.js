import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

/**
 * Verify tree image using Gemini 1.5 Flash-lite
 * Returns analysis of whether it's a sapling or grown plant
 */
export const verifyTreeImage = async (imageBuffer) => {
  try {
    if (!imageBuffer) {
      return {
        verified: false,
        status: 'no_image',
        message: 'No image provided',
        analysis: null,
        confidence: 0,
      };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const base64Image = imageBuffer.toString('base64');
    const mimeType = 'image/jpeg'; // Default - adjust based on actual image type

    const prompt = `Analyze this image and determine if it shows a tree. 
    Return a JSON object with the following structure:
    {
      "isTree": boolean,
      "treeType": "sapling|young_tree|mature_tree|none",
      "confidence": number (0-100),
      "description": "brief description of what you see",
      "healthStatus": "healthy|unhealthy|dead|unknown",
      "estimatedAge": "estimated age or stage of tree",
      "plantSpecies": "if identifiable, the plant species or 'unknown'"
    }
    
    Be strict in verification. If it's not clearly a tree, set isTree to false.`;

    const response = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
      prompt,
    ]);

    const responseText = response.response.text();
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON response from Gemini');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      verified: analysis.isTree,
      status: analysis.isTree ? 'verified' : 'invalid',
      message: analysis.isTree ? 'Image verified as tree' : 'Image is not a valid tree',
      analysis: {
        treeType: analysis.treeType,
        confidence: analysis.confidence,
        description: analysis.description,
        healthStatus: analysis.healthStatus,
        estimatedAge: analysis.estimatedAge,
        plantSpecies: analysis.plantSpecies,
      },
      confidence: analysis.confidence,
    };
  } catch (error) {
    console.error('Error verifying tree image:', error);
    return {
      verified: false,
      status: 'verification_failed',
      message: `Image verification failed: ${error.message}`,
      analysis: null,
      confidence: 0,
    };
  }
};

/**
 * Generate custom structured output for tree planting
 */
export const generateTreePlantingResponse = (tree, verification, nearbyTrees) => {
  return {
    success: true,
    message: 'Tree successfully planted',
    data: {
      tree: {
        id: tree.ID,
        userId: tree.USER_ID,
        type: tree.TYPE,
        location: {
          latitude: tree.LATITUDE,
          longitude: tree.LONGITUDE,
          coordinates: {
            lat: tree.LATITUDE,
            lng: tree.LONGITUDE,
          },
        },
        metadata: {
          notes: tree.NOTES,
          plantedAt: tree.CREATED_AT,
        },
      },
      verification: {
        imageVerified: verification.verified,
        verificationStatus: verification.status,
        verificationMessage: verification.message,
        analysis: verification.analysis,
        confidence: verification.confidence,
      },
      surroundings: {
        radiusChecked: '1m',
        nearbyTreeCount: nearbyTrees.length,
        nearbyTrees: nearbyTrees.map((t) => ({
          id: t.ID,
          type: t.TYPE,
          distance: t.distance,
          location: {
            latitude: t.LATITUDE,
            longitude: t.LONGITUDE,
          },
        })),
      },
      reward: {
        pointsAdded: 50,
        totalPoints: tree.TOTAL_SCORE || 50,
        tier: calculateTier(tree.TOTAL_SCORE || 50),
      },
    },
  };
};

/**
 * Calculate tier based on points
 */
const calculateTier = (totalScore) => {
  if (totalScore >= 10000) return 'Earth Guardian';
  if (totalScore >= 5000) return 'Forest Master';
  if (totalScore >= 1000) return 'Eco Warrior';
  if (totalScore >= 500) return 'Nature Friend';
  if (totalScore >= 100) return 'Green Starter';
  return 'Beginner';
};
