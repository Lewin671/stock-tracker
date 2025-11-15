package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Try alternative Yahoo Finance endpoints
func main() {
	symbol := "AAPL"
	fmt.Printf("Testing alternative Yahoo Finance endpoints for %s...\n\n", symbol)
	
	// Try v8/finance/chart endpoint (more reliable)
	endTime := time.Now()
	startTime := endTime.AddDate(0, 0, -7) // Last 7 days
	
	url := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v8/finance/chart/%s?period1=%d&period2=%d&interval=1d",
		symbol,
		startTime.Unix(),
		endTime.Unix(),
	)
	
	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		return
	}
	
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error making request: %v\n", err)
		return
	}
	defer resp.Body.Close()
	
	fmt.Printf("Status Code: %d\n", resp.StatusCode)
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading response: %v\n", err)
		return
	}
	
	if resp.StatusCode != 200 {
		fmt.Printf("Error response: %s\n", string(body))
		return
	}
	
	// Parse the response
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Printf("Error parsing JSON: %v\n", err)
		return
	}
	
	// Pretty print the response
	prettyJSON, _ := json.MarshalIndent(result, "", "  ")
	fmt.Printf("\n✓ Successfully fetched data!\n\nResponse:\n%s\n", string(prettyJSON))
	
	// Extract key information
	if chart, ok := result["chart"].(map[string]interface{}); ok {
		if resultArray, ok := chart["result"].([]interface{}); ok && len(resultArray) > 0 {
			if data, ok := resultArray[0].(map[string]interface{}); ok {
				if meta, ok := data["meta"].(map[string]interface{}); ok {
					fmt.Printf("\n=== Stock Information ===\n")
					fmt.Printf("Symbol: %v\n", meta["symbol"])
					fmt.Printf("Currency: %v\n", meta["currency"])
					fmt.Printf("Regular Market Price: %v\n", meta["regularMarketPrice"])
					fmt.Printf("Previous Close: %v\n", meta["previousClose"])
				}
			}
		}
	}
	
	// Test Chinese stock
	fmt.Println("\n==================================================\n")
	chinaSymbol := "600000.SS"
	fmt.Printf("Testing Yahoo Finance for Chinese stock %s...\n\n", chinaSymbol)
	
	url2 := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v8/finance/chart/%s?period1=%d&period2=%d&interval=1d",
		chinaSymbol,
		startTime.Unix(),
		endTime.Unix(),
	)
	
	req2, _ := http.NewRequest("GET", url2, nil)
	req2.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	
	resp2, err := client.Do(req2)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	defer resp2.Body.Close()
	
	fmt.Printf("Status Code: %d\n", resp2.StatusCode)
	
	body2, _ := io.ReadAll(resp2.Body)
	
	var result2 map[string]interface{}
	json.Unmarshal(body2, &result2)
	
	if chart, ok := result2["chart"].(map[string]interface{}); ok {
		if resultArray, ok := chart["result"].([]interface{}); ok && len(resultArray) > 0 {
			if data, ok := resultArray[0].(map[string]interface{}); ok {
				if meta, ok := data["meta"].(map[string]interface{}); ok {
					fmt.Printf("\n✓ Chinese stock data available!\n")
					fmt.Printf("\n=== Stock Information ===\n")
					fmt.Printf("Symbol: %v\n", meta["symbol"])
					fmt.Printf("Currency: %v\n", meta["currency"])
					fmt.Printf("Regular Market Price: %v\n", meta["regularMarketPrice"])
				}
			}
		}
	}
}
