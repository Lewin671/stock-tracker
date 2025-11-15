package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type yahooQuoteResponse struct {
	QuoteResponse struct {
		Result []struct {
			Symbol             string  `json:"symbol"`
			ShortName          string  `json:"shortName"`
			LongName           string  `json:"longName"`
			RegularMarketPrice float64 `json:"regularMarketPrice"`
			Currency           string  `json:"currency"`
			Sector             string  `json:"sector"`
		} `json:"result"`
		Error interface{} `json:"error"`
	} `json:"quoteResponse"`
}

func main() {
	// Test AAPL
	symbol := "AAPL"
	fmt.Printf("Testing Yahoo Finance API for %s...\n\n", symbol)
	
	url := fmt.Sprintf("https://query1.finance.yahoo.com/v7/finance/quote?symbols=%s", symbol)
	
	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		return
	}
	
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
	req.Header.Set("Accept", "application/json")
	
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
	
	var quoteResp yahooQuoteResponse
	if err := json.Unmarshal(body, &quoteResp); err != nil {
		fmt.Printf("Error parsing JSON: %v\n", err)
		fmt.Printf("Raw response: %s\n", string(body))
		return
	}
	
	if len(quoteResp.QuoteResponse.Result) == 0 {
		fmt.Println("No results found")
		return
	}
	
	result := quoteResp.QuoteResponse.Result[0]
	
	fmt.Println("✓ Successfully fetched data from Yahoo Finance!")
	fmt.Printf("\nStock Information:\n")
	fmt.Printf("  Symbol: %s\n", result.Symbol)
	fmt.Printf("  Name: %s\n", result.ShortName)
	fmt.Printf("  Price: $%.2f\n", result.RegularMarketPrice)
	fmt.Printf("  Currency: %s\n", result.Currency)
	fmt.Printf("  Sector: %s\n", result.Sector)
	
	// Test Chinese stock
	fmt.Println("\n" + string(make([]byte, 50)) + "\n")
	chinaSymbol := "600000.SS"
	fmt.Printf("Testing Yahoo Finance API for Chinese stock %s...\n\n", chinaSymbol)
	
	url2 := fmt.Sprintf("https://query1.finance.yahoo.com/v7/finance/quote?symbols=%s", chinaSymbol)
	
	req2, err := http.NewRequest("GET", url2, nil)
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		return
	}
	
	req2.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
	req2.Header.Set("Accept", "application/json")
	
	resp2, err := client.Do(req2)
	if err != nil {
		fmt.Printf("Error making request: %v\n", err)
		return
	}
	defer resp2.Body.Close()
	
	fmt.Printf("Status Code: %d\n", resp2.StatusCode)
	
	body2, err := io.ReadAll(resp2.Body)
	if err != nil {
		fmt.Printf("Error reading response: %v\n", err)
		return
	}
	
	var quoteResp2 yahooQuoteResponse
	if err := json.Unmarshal(body2, &quoteResp2); err != nil {
		fmt.Printf("Error parsing JSON: %v\n", err)
		return
	}
	
	if len(quoteResp2.QuoteResponse.Result) == 0 {
		fmt.Println("No results found for Chinese stock")
		return
	}
	
	result2 := quoteResp2.QuoteResponse.Result[0]
	
	fmt.Println("✓ Successfully fetched Chinese stock data from Yahoo Finance!")
	fmt.Printf("\nStock Information:\n")
	fmt.Printf("  Symbol: %s\n", result2.Symbol)
	fmt.Printf("  Name: %s\n", result2.ShortName)
	fmt.Printf("  Price: %.2f\n", result2.RegularMarketPrice)
	fmt.Printf("  Currency: %s\n", result2.Currency)
}
