package main

import (
	"log"
	"net/http"
	"os"

	handler "github.com/alexcaulfield/setlistify/api"
	"github.com/joho/godotenv"
)

func main() {
	// Try loading local .env or flask-app/.env if present
	_ = godotenv.Load(".env")
	_ = godotenv.Load("flask-app/.env")

	mux := http.NewServeMux()

	mux.HandleFunc("/api/authUrl", handler.AuthUrl)
	mux.HandleFunc("/api/getUser", handler.GetUser)
	mux.HandleFunc("/api/artistSearch", handler.ArtistSearch)
	mux.HandleFunc("/api/setlistArtists", handler.SetlistArtists)
	mux.HandleFunc("/api/artistSetlists", handler.ArtistSetlists)
	mux.HandleFunc("/api/buildPlaylist", handler.BuildPlaylist)

	// Also map root routes for direct backwards compatibility if accessed without /api
	mux.HandleFunc("/authUrl", handler.AuthUrl)
	mux.HandleFunc("/getUser", handler.GetUser)
	mux.HandleFunc("/artistSearch", handler.ArtistSearch)
	mux.HandleFunc("/setlistArtists", handler.SetlistArtists)
	mux.HandleFunc("/artistSetlists", handler.ArtistSetlists)
	mux.HandleFunc("/buildPlaylist", handler.BuildPlaylist)

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	log.Printf("Starting Setlistify Go dev server on :%s ...", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

