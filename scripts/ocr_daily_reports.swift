import Foundation
import Vision

struct OCRLine {
    let text: String
    let x: Double
    let y: Double
    let w: Double
    let h: Double
    let confidence: Float
}

func recognize(path: String) throws -> [OCRLine] {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .fast
    request.usesLanguageCorrection = false
    if #available(macOS 11.0, *) {
        let supported = (try? request.supportedRecognitionLanguages()) ?? []
        let preferred = ["ja-JP", "en-US"].filter { supported.contains($0) }
        if !preferred.isEmpty {
            request.recognitionLanguages = preferred
        }
    }

    let handler = VNImageRequestHandler(url: URL(fileURLWithPath: path), options: [:])
    try handler.perform([request])

    let observations = request.results ?? []
    return observations.compactMap { obs in
        guard let candidate = obs.topCandidates(1).first else { return nil }
        let box = obs.boundingBox
        return OCRLine(
            text: candidate.string,
            x: Double(box.minX),
            y: Double(box.minY),
            w: Double(box.width),
            h: Double(box.height),
            confidence: candidate.confidence
        )
    }
}

func groupedLines(_ lines: [OCRLine]) -> [[OCRLine]] {
    let sorted = lines.sorted {
        if abs($0.y - $1.y) > 0.006 { return $0.y > $1.y }
        return $0.x < $1.x
    }
    var rows: [[OCRLine]] = []
    for line in sorted {
        if let last = rows.indices.last {
            let avgY = rows[last].map(\.y).reduce(0, +) / Double(rows[last].count)
            if abs(avgY - line.y) <= max(0.007, Double(line.h) * 0.55) {
                rows[last].append(line)
                continue
            }
        }
        rows.append([line])
    }
    return rows.map { $0.sorted { $0.x < $1.x } }
}

func csvEscape(_ value: String) -> String {
    if value.contains(",") || value.contains("\"") || value.contains("\n") {
        return "\"" + value.replacingOccurrences(of: "\"", with: "\"\"") + "\""
    }
    return value
}

let args = CommandLine.arguments.dropFirst()
guard args.count >= 2 else {
    fputs("usage: swift ocr_daily_reports.swift INPUT_DIR OUTPUT_DIR\n", stderr)
    exit(2)
}

let inputDir = String(args[args.startIndex])
let outputDir = String(args[args.index(after: args.startIndex)])
try FileManager.default.createDirectory(atPath: outputDir, withIntermediateDirectories: true)

let files = try FileManager.default.contentsOfDirectory(atPath: inputDir)
    .filter { $0.lowercased().hasSuffix(".jpg") || $0.lowercased().hasSuffix(".jpeg") || $0.lowercased().hasSuffix(".png") }
    .sorted()

for file in files {
    let path = (inputDir as NSString).appendingPathComponent(file)
    let stem = (file as NSString).deletingPathExtension
    do {
        let lines = try recognize(path: path)
        let rows = groupedLines(lines)

        let rawPath = (outputDir as NSString).appendingPathComponent("\(stem).raw.txt")
        let rawText = rows.map { row in row.map(\.text).joined(separator: "\t") }.joined(separator: "\n")
        try rawText.write(toFile: rawPath, atomically: true, encoding: .utf8)

        let coordPath = (outputDir as NSString).appendingPathComponent("\(stem).ocr.csv")
        var coord = "text,x,y,w,h,confidence\n"
        for line in lines.sorted(by: { $0.y == $1.y ? $0.x < $1.x : $0.y > $1.y }) {
            coord += [line.text, String(format: "%.6f", line.x), String(format: "%.6f", line.y), String(format: "%.6f", line.w), String(format: "%.6f", line.h), String(format: "%.3f", line.confidence)]
                .map(csvEscape)
                .joined(separator: ",") + "\n"
        }
        try coord.write(toFile: coordPath, atomically: true, encoding: .utf8)

        print("\(file): \(lines.count) items")
    } catch {
        fputs("\(file): ERROR \(error)\n", stderr)
    }
}
