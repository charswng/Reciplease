// Import necessary modules
const fs = require('fs');
const express = require('express');
const bparser = require('body-parser');
const path = require('path');
const axios = require('axios'); //For API(?)
const http = require('http');
const { MongoClient } = require('mongodb');

process.stdin.setEncoding("UTF8");


require("dotenv").config({path : path.resolve(__dirname, '/.env') })
const username = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const dbAndCollection = {db_name: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};

const uri = `mongodb+srv://${username}:${password}@cluster0.3vnum.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
const client = new MongoClient(uri);

// Initialize Express application
const app = express();
const PORT = 3000;

app.use(bparser.urlencoded({extended:false}));

// Set EJS as the view engine
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

// Routes
app.get('/', (req, res) => {
    res.render("index");
});

app.post('/', (req, res) => {
    formName = req.body.name; 
    insertUser(formName);
})

app.post('/recipes', async (req, res) => {
    const { ingredients } = req.body;

    if (!ingredients) {
        return res.render('reciplease', { error: 'Please provide some ingredients.', recipes: [] });
    }

    const ingredientList = ingredients.split(',').map(ing => ing.trim()).join(','); // Format ingredients

    try {
        // Fetch recipes from an external API (Spoonacular example)
        const apiKey = 'ad41eb05b0cb419ea191d129023404ad';
        const response = await axios.get(`https://api.spoonacular.com/recipes/findByIngredients`, {
            params: {
                ingredients: ingredientList,
                number: 5, // Limit results to 5 recipes
                apiKey: apiKey
            }
        });

        const recipes = response.data.map(recipe => ({
            name: recipe.title,
            description: recipe.title, // Spoonacular doesn't provide descriptions here
            ingredients: recipe.usedIngredients.map(ing => ing.name)
        }));

        res.render('index', { recipes, error: null });
    } catch (error) {
        console.error(error);
        res.render('index', { error: 'Failed to fetch recipes. Please try again.', recipes: [] });
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