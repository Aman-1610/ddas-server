package com.aman.ddas.server.dto;

import com.aman.ddas.server.model.DownloadedFile;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DuplicateCheckResponse {

    private boolean isDuplicate;
    private DownloadedFile fileInfo;

    /**
     * Factory method to create a response for a confirmed duplicate.
     * @param existingFile The file entity that was found.
     * @return A new DuplicateCheckResponse object.
     */
    public static DuplicateCheckResponse duplicate(DownloadedFile existingFile) {
        return new DuplicateCheckResponse(true, existingFile);
    }

    /**
     * Factory method to create a response when no duplicate is found.
     * @return A new DuplicateCheckResponse object.
     */
    public static DuplicateCheckResponse notADuplicate() {
        return new DuplicateCheckResponse(false, null);
    }
}