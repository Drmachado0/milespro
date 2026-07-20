package br.com.milespro.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

public class SecurityConfigurationTest {
    private static final String ANDROID_NAMESPACE = "http://schemas.android.com/apk/res/android";

    @Test
    public void applicationBackupsAreDisabled() throws Exception {
        Document manifest = parseSourceFile("AndroidManifest.xml");
        Element application = (Element) manifest.getElementsByTagName("application").item(0);

        assertEquals("false", application.getAttributeNS(ANDROID_NAMESPACE, "allowBackup"));
        assertEquals("false", application.getAttributeNS(ANDROID_NAMESPACE, "fullBackupContent"));
    }

    @Test
    public void fileProviderDoesNotExposeAnEntireStorageRoot() throws Exception {
        Document paths = parseSourceFile("res/xml/file_paths.xml");

        for (String tagName : new String[] {"external-path", "cache-path"}) {
            NodeList entries = paths.getElementsByTagName(tagName);
            for (int index = 0; index < entries.getLength(); index++) {
                String configuredPath = ((Element) entries.item(index)).getAttribute("path").trim();
                assertFalse(tagName + " must use a dedicated subdirectory", configuredPath.isEmpty());
                assertFalse(tagName + " must not expose the storage root", ".".equals(configuredPath));
                assertFalse(tagName + " must not permit parent traversal", configuredPath.contains(".."));
            }
        }
    }

    private Document parseSourceFile(String relativePath) throws Exception {
        Path sourceFile = locateMainSource().resolve(relativePath);
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        return factory.newDocumentBuilder().parse(sourceFile.toFile());
    }

    private Path locateMainSource() {
        Path workingDirectory = Paths.get(System.getProperty("user.dir")).toAbsolutePath();
        for (Path candidate : new Path[] {
                workingDirectory.resolve("app/src/main"),
                workingDirectory.resolve("src/main"),
                workingDirectory.resolve("android/app/src/main")}) {
            if (Files.isDirectory(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not locate Android app/src/main from " + workingDirectory);
    }
}
