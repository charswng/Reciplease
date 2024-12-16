process.stdin.setEncoding("utf8");
const fs = require('fs');
const express = require('express');
const bparser = require('body-parser');
const path = require('path');
const axios = require('axios'); //For API(?)
const http = require('http');
const { MongoClient } = require('mongodb');
const app = express();
const PORT = 3000;

process.stdin.setEncoding("UTF8");


require("dotenv").config({path : path.resolve(__dirname, '.env') })
const username = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const dbAndCollection = {db_name: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};

const uri = process.env.MONGO_CONNECTION_STRING;
const client = new MongoClient(uri);

app.use(bparser.urlencoded({extended:false}));

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

app.use(express.static(__dirname + '/styles'));

app.get('/', (req, res) => {
    res.render('reciplease', { recipes: [], error: null });
});

app.post('/reciplease', async (req, res) => {

    let formName = req.body.name; 
    insertUser({name : formName})

    const { ingredients } = req.body;

    if (!ingredients) {
        return res.render('reciplease', { error: 'Please provide some ingredients.', recipes: [] });
    }

    const ingredientList = ingredients.split(',').map(ing => ing.trim()).join(','); // Format ingredients

    try {
    
        const response = await axios.get(`https://api.spoonacular.com/recipes/findByIngredients`, {
            params: {
                ingredients: ingredientList,
                number: 6,
                apiKey: process.env.apiKey
            }
        });

        const recipes = response.data.map(recipe => ({
            name: recipe.title,
            id: recipe.id,
            image: recipe.image,
            ingredients: recipe.usedIngredients.map(ing => ing.name)
        }));

        const recipesWithDetails = await Promise.all(
            recipes.map(async (recipe) => {
                try {
                    const recipeInfo = await axios.get(`https://api.spoonacular.com/recipes/${recipe.id}/information`, {
                        params: { includeNutrition: false, apiKey: process.env.apiKey },
                    });

                    return {
                        ...recipe,
                        summary: recipeInfo.data.summary.replace(/<\/?[^>]+(>|$)/g, ""), // Add summary to the recipe
                        url: recipeInfo.data.spoonacularSourceUrl, // Add recipe URL
                    };
                } catch (error) {
                    console.error(`Failed to fetch details for recipe ID ${recipe.id}:`, error);
                    return { ...recipe, summary: 'Details not available', url: '#' };
                }
            })
        );

        res.render('reciplease', { recipes: recipesWithDetails, error: null });
    } catch (error) {
        console.error(error);
        res.render('reciplease', { error: 'Failed to fetch recipes. Please try again.', recipes: [] });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

async function insertUser(name) {
    try {
        await client.connect();
        await client
            .db(dbAndCollection.db_name)
            .collection(dbAndCollection.collection)
            .insertOne(name);
    } catch (error) {
        console.error(error);
    } finally {
        await client.close();
    }
}