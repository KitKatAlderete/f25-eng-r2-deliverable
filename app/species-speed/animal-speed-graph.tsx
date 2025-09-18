/* eslint-disable */
"use client";
import { max } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis"; // D3 is a JavaScript library for data visualization: https://d3js.org/
import type { DSVRowString } from "d3-dsv";
import { csv } from "d3-fetch";
import { scaleBand, scaleLinear, scaleOrdinal } from "d3-scale";
import { select } from "d3-selection";
import { useEffect, useRef, useState } from "react";

// Example data: Only the first three rows are provided as an example
// Add more animals or change up the style as you desire

// TODO: Write this interface
interface AnimalDatum {
  name: string;
  speed: number;
  diet: "Herbivore" | "Carnivore" | "Omnivore";
}

export default function AnimalSpeedGraph() {
  // useRef creates a reference to the div where D3 will draw the chart.
  // https://react.dev/reference/react/useRef
  const graphRef = useRef<HTMLDivElement>(null);

  const [animalData, setAnimalData] = useState<AnimalDatum[]>([]);

  // TODO: Load CSV data
  useEffect(() => {
    let cancelled = false;

    csv<AnimalDatum>("/sample_animals.csv", (d: DSVRowString, _i, columns): AnimalDatum | undefined => ({
      name: d["Animal"]!, // still strings coming in
      speed: +d["Top Speed (km/h)"]!, // coerce to number
      diet: d["Diet"] as AnimalDatum["diet"],
    })).then((rows) => {
      if (!cancelled) setAnimalData(rows);
      console.log(Object.keys(rows));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Clear any previous SVG to avoid duplicates when React hot-reloads
    if (graphRef.current) {
      graphRef.current.innerHTML = "";
    }

    if (animalData.length === 0) return;

    // Set up chart dimensions and margins
    const containerWidth = graphRef.current?.clientWidth ?? 800;
    const containerHeight = graphRef.current?.clientHeight ?? 500;

    // Set up chart dimensions and margins
    const width = Math.max(containerWidth, 600); // Minimum width of 600px
    const height = Math.max(containerHeight, 400); // Minimum height of 400px
    const margin = { top: 70, right: 60, bottom: 80, left: 100 };

    // Create the SVG element where D3 will draw the chart
    // https://github.com/d3/d3-selection
    const svg = select(graphRef.current!).append<SVGSVGElement>("svg").attr("width", width).attr("height", height);

    // Implement the rest of the graph --------------------

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create x axis based on animal names
    const x = scaleBand<string>()
      .domain(animalData.map((d) => d.name))
      .range([0, innerWidth])
      .padding(0.2);

    // Create y axis based on animal speeds
    const y = scaleLinear()
      .domain([0, max(animalData, (d) => d.speed)!])
      .nice()
      .range([innerHeight, 0]);

    // Create color scale based on diet
    const color = scaleOrdinal<AnimalDatum["diet"], string>()
      .domain(["Herbivore", "Carnivore", "Omnivore"])
      .range(["#5AA469", "#C75C5C", "#4D96FF"]);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Define axis variables
    const xAxis = axisBottom(x);
    const yAxis = axisLeft(y).ticks(6);

    // Draw x axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.4em")
      .attr("dy", "0.2em")
      .attr("transform", "rotate(-90)"); // tilt labels if they overlap

    g.append("g").call(yAxis);

    // Axis titles
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 50)
      .attr("text-anchor", "middle")
      .attr("font-weight", 600)
      .text("Animal");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -60)
      .attr("text-anchor", "middle")
      .attr("font-weight", 600)
      .text("Speed (km/h)");

    // === BARS ===
    g.selectAll("rect.bar")
      .data(animalData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.name)!)
      .attr("y", (d) => y(d.speed))
      .attr("width", x.bandwidth())
      .attr("height", (d) => innerHeight - y(d.speed))
      .attr("fill", (d) => color(d.diet));

    // Optional: simple value labels
    g.selectAll("text.bar-label")
      .data(animalData)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", (d) => x(d.name)! + x.bandwidth() / 2)
      .attr("y", (d) => y(d.speed) - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .text((d) => d.speed.toString());

    const legend = g.append("g").attr("transform", `translate(${innerWidth - 150}, -10)`);

    const diets: AnimalDatum["diet"][] = ["Herbivore", "Carnivore", "Omnivore"];

    legend
      .selectAll("g.legend-item")
      .data(diets)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (_d, i) => `translate(0, ${i * 20})`)
      .each(function (d) {
        const item = select(this);
        item.append("rect").attr("width", 14).attr("height", 14).attr("rx", 2).attr("ry", 2).attr("fill", color(d));
        item.append("text").attr("x", 20).attr("y", 11).attr("font-size", 12).text(d);
      });

    // Optional chart title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 18)
      .attr("font-weight", 700)
      .text("Animal Speeds by Diet");
  }, [animalData]);

  // Return the graph
  return <div ref={graphRef} style={{ width: "100%", height: 500, position: "relative" }} />;
}
