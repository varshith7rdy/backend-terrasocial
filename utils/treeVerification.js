import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from "dotenv"
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envConfig = dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (envConfig.parsed) {
  Object.assign(process.env, envConfig.parsed);
}


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  console.log("Distance returned!")
  return distance;
};


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

    console.log("verifying tree image")
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const base64Image = imageBuffer.toString('base64');
    const mimeType = 'image/jpeg'; 

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

    console.log(process.env.GEMINI_API_KEY);


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


const calculateTier = (totalScore) => {
  if (totalScore >= 10000) return 'Earth Guardian';
  if (totalScore >= 5000) return 'Forest Master';
  if (totalScore >= 1000) return 'Eco Warrior';
  if (totalScore >= 500) return 'Nature Friend';
  if (totalScore >= 100) return 'Green Starter';
  return 'Beginner';
};
