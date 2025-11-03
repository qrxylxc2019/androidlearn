package com.awesomeproject

import android.database.sqlite.SQLiteDatabase
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import java.io.File
import java.io.FileOutputStream

class StudentDatabaseModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        // 数据库版本号 - 每次更新数据库时增加这个版本号
        private const val DB_VERSION = 2
    }

    override fun getName(): String {
        return "StudentDatabaseModule"
    }

    private fun getDatabaseVersion(): Int {
        val prefs = reactApplicationContext.getSharedPreferences("database_prefs", 0)
        return prefs.getInt("db_version", 0)
    }

    private fun setDatabaseVersion(version: Int) {
        val prefs = reactApplicationContext.getSharedPreferences("database_prefs", 0)
        prefs.edit().putInt("db_version", version).apply()
    }

    private fun copyDatabaseFromAssets(forceRefresh: Boolean = false): File {
        val dbFile = File(reactApplicationContext.filesDir, "haha.db")
        val currentVersion = getDatabaseVersion()
        
        // 如果版本号不匹配或强制刷新，删除旧数据库
        if ((currentVersion < DB_VERSION || forceRefresh) && dbFile.exists()) {
            dbFile.delete()
        }
        
        // 如果数据库已存在，直接返回
        if (dbFile.exists()) {
            // 确保新表存在
            ensureTablesExist(dbFile)
            return dbFile
        }
        
        // 从assets复制数据库
        reactApplicationContext.assets.open("haha.db").use { input ->
            FileOutputStream(dbFile).use { output ->
                input.copyTo(output)
            }
        }
        
        // 确保新表存在
        ensureTablesExist(dbFile)
        
        // 更新版本号
        setDatabaseVersion(DB_VERSION)
        
        return dbFile
    }

    private fun ensureTablesExist(dbFile: File) {
        val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
        
        try {
            // 检查 exam_question 表是否存在
            val cursor = db.rawQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='exam_question'", null)
            val examQuestionExists = cursor.count > 0
            cursor.close()
            
            if (!examQuestionExists) {
                // 创建 exam_question 表
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS exam_question (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        question TEXT,
                        subjectid INTEGER
                    )
                """.trimIndent())
            }
            
            // 检查 exam_items 表是否存在
            val cursor2 = db.rawQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='exam_items'", null)
            val examItemsExists = cursor2.count > 0
            cursor2.close()
            
            if (!examItemsExists) {
                // 创建 exam_items 表
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS exam_items (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        qid INTEGER,
                        type TEXT,
                        answer TEXT,
                        items TEXT,
                        explain TEXT
                    )
                """.trimIndent())
            }
        } finally {
            db.close()
        }
    }

    @ReactMethod
    fun getAllStudents(promise: Promise) {
        try {
            val dbFile = copyDatabaseFromAssets(false)
            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
            
            val cursor = db.rawQuery("SELECT * FROM student", null)
            val resultArray = WritableNativeArray()
            
            if (cursor.moveToFirst()) {
                val columnCount = cursor.columnCount
                do {
                    val rowMap = WritableNativeMap()
                    for (i in 0 until columnCount) {
                        val columnName = cursor.getColumnName(i)
                        when (cursor.getType(i)) {
                            android.database.Cursor.FIELD_TYPE_INTEGER -> {
                                rowMap.putInt(columnName, cursor.getInt(i))
                            }
                            android.database.Cursor.FIELD_TYPE_FLOAT -> {
                                rowMap.putDouble(columnName, cursor.getDouble(i))
                            }
                            android.database.Cursor.FIELD_TYPE_STRING -> {
                                rowMap.putString(columnName, cursor.getString(i))
                            }
                            android.database.Cursor.FIELD_TYPE_NULL -> {
                                rowMap.putNull(columnName)
                            }
                            else -> {
                                rowMap.putString(columnName, cursor.getString(i))
                            }
                        }
                    }
                    resultArray.pushMap(rowMap)
                } while (cursor.moveToNext())
            }
            
            cursor.close()
            db.close()
            promise.resolve(resultArray)
        } catch (e: Exception) {
            promise.reject("DATABASE_ERROR", "Error reading database: ${e.message}", e)
        }
    }

    @ReactMethod
    fun insertStudent(name: String, promise: Promise) {
        try {
            val dbFile = copyDatabaseFromAssets(false)
            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
            
            // 插入数据
            val sql = "INSERT INTO student (name) VALUES (?)"
            db.execSQL(sql, arrayOf(name))
            
            // 获取插入的ID
            val cursor = db.rawQuery("SELECT last_insert_rowid()", null)
            var insertedId: Long = -1
            if (cursor.moveToFirst()) {
                insertedId = cursor.getLong(0)
            }
            cursor.close()
            db.close()
            
            promise.resolve(insertedId.toInt())
        } catch (e: Exception) {
            promise.reject("DATABASE_ERROR", "Error inserting student: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getQuestions(page: Int, pageSize: Int, promise: Promise) {
        try {
            val dbFile = copyDatabaseFromAssets(false)
            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
            
            val offset = page * pageSize
            val cursor = db.rawQuery("SELECT * FROM question LIMIT ? OFFSET ?", arrayOf(pageSize.toString(), offset.toString()))
            val resultArray = WritableNativeArray()
            
            if (cursor.moveToFirst()) {
                val columnCount = cursor.columnCount
                do {
                    val rowMap = WritableNativeMap()
                    for (i in 0 until columnCount) {
                        val columnName = cursor.getColumnName(i)
                        when (cursor.getType(i)) {
                            android.database.Cursor.FIELD_TYPE_INTEGER -> {
                                rowMap.putInt(columnName, cursor.getInt(i))
                            }
                            android.database.Cursor.FIELD_TYPE_FLOAT -> {
                                rowMap.putDouble(columnName, cursor.getDouble(i))
                            }
                            android.database.Cursor.FIELD_TYPE_STRING -> {
                                rowMap.putString(columnName, cursor.getString(i))
                            }
                            android.database.Cursor.FIELD_TYPE_NULL -> {
                                rowMap.putNull(columnName)
                            }
                            else -> {
                                rowMap.putString(columnName, cursor.getString(i))
                            }
                        }
                    }
                    resultArray.pushMap(rowMap)
                } while (cursor.moveToNext())
            }
            
            cursor.close()
            db.close()
            promise.resolve(resultArray)
        } catch (e: Exception) {
            promise.reject("DATABASE_ERROR", "Error reading questions: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getTotalQuestions(promise: Promise) {
        try {
            val dbFile = copyDatabaseFromAssets(false)
            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
            
            val cursor = db.rawQuery("SELECT COUNT(*) FROM question", null)
            var total = 0
            if (cursor.moveToFirst()) {
                total = cursor.getInt(0)
            }
            cursor.close()
            db.close()
            
            promise.resolve(total)
        } catch (e: Exception) {
            promise.reject("DATABASE_ERROR", "Error counting questions: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getAllSubjects(promise: Promise) {
        try {
            val dbFile = copyDatabaseFromAssets(false)
            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
            
            val cursor = db.rawQuery("SELECT * FROM subject ORDER BY id", null)
            val resultArray = WritableNativeArray()
            
            if (cursor.moveToFirst()) {
                val columnCount = cursor.columnCount
                do {
                    val rowMap = WritableNativeMap()
                    for (i in 0 until columnCount) {
                        val columnName = cursor.getColumnName(i)
                        when (cursor.getType(i)) {
                            android.database.Cursor.FIELD_TYPE_INTEGER -> {
                                rowMap.putInt(columnName, cursor.getInt(i))
                            }
                            android.database.Cursor.FIELD_TYPE_FLOAT -> {
                                rowMap.putDouble(columnName, cursor.getDouble(i))
                            }
                            android.database.Cursor.FIELD_TYPE_STRING -> {
                                rowMap.putString(columnName, cursor.getString(i))
                            }
                            android.database.Cursor.FIELD_TYPE_NULL -> {
                                rowMap.putNull(columnName)
                            }
                            else -> {
                                rowMap.putString(columnName, cursor.getString(i))
                            }
                        }
                    }
                    resultArray.pushMap(rowMap)
                } while (cursor.moveToNext())
            }
            
            cursor.close()
            db.close()
            promise.resolve(resultArray)
        } catch (e: Exception) {
            promise.reject("DATABASE_ERROR", "Error reading subjects: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getQuestionsBySubject(subjectId: Int, promise: Promise) {
        try {
            val dbFile = copyDatabaseFromAssets(false)
            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
            
            val cursor = db.rawQuery("SELECT * FROM question WHERE subjectid = ?", arrayOf(subjectId.toString()))
            val resultArray = WritableNativeArray()
            
            if (cursor.moveToFirst()) {
                val columnCount = cursor.columnCount
                do {
                    val rowMap = WritableNativeMap()
                    for (i in 0 until columnCount) {
                        val columnName = cursor.getColumnName(i)
                        when (cursor.getType(i)) {
                            android.database.Cursor.FIELD_TYPE_INTEGER -> {
                                rowMap.putInt(columnName, cursor.getInt(i))
                            }
                            android.database.Cursor.FIELD_TYPE_FLOAT -> {
                                rowMap.putDouble(columnName, cursor.getDouble(i))
                            }
                            android.database.Cursor.FIELD_TYPE_STRING -> {
                                rowMap.putString(columnName, cursor.getString(i))
                            }
                            android.database.Cursor.FIELD_TYPE_NULL -> {
                                rowMap.putNull(columnName)
                            }
                            else -> {
                                rowMap.putString(columnName, cursor.getString(i))
                            }
                        }
                    }
                    resultArray.pushMap(rowMap)
                } while (cursor.moveToNext())
            }
            
            cursor.close()
            db.close()
            promise.resolve(resultArray)
        } catch (e: Exception) {
            promise.reject("DATABASE_ERROR", "Error reading questions by subject: ${e.message}", e)
        }
    }

    @ReactMethod
    fun deleteQuestion(questionId: Int, promise: Promise) {
        try {
            val dbFile = copyDatabaseFromAssets(false)
            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
            
            // 删除题目
            val sql = "DELETE FROM question WHERE id = ?"
            db.execSQL(sql, arrayOf(questionId.toString()))
            
            db.close()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DATABASE_ERROR", "Error deleting question: ${e.message}", e)
        }
    }

    @ReactMethod
    fun updateQuestionCollectStatus(questionId: Int, collectStatus: String, promise: Promise) {
        try {
            val dbFile = copyDatabaseFromAssets(false)
            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
            
            // 更新收藏状态
            val sql = "UPDATE question SET iscollect = ? WHERE id = ?"
            db.execSQL(sql, arrayOf(collectStatus, questionId.toString()))
            
            db.close()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DATABASE_ERROR", "Error updating collect status: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getCollectedQuestionsBySubject(subjectId: Int, promise: Promise) {
        try {
            val dbFile = copyDatabaseFromAssets(false)
            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
            
            val cursor = db.rawQuery("SELECT * FROM question WHERE subjectid = ? AND iscollect = '1'", arrayOf(subjectId.toString()))
            val resultArray = WritableNativeArray()
            
            if (cursor.moveToFirst()) {
                val columnCount = cursor.columnCount
                do {
                    val rowMap = WritableNativeMap()
                    for (i in 0 until columnCount) {
                        val columnName = cursor.getColumnName(i)
                        when (cursor.getType(i)) {
                            android.database.Cursor.FIELD_TYPE_INTEGER -> {
                                rowMap.putInt(columnName, cursor.getInt(i))
                            }
                            android.database.Cursor.FIELD_TYPE_FLOAT -> {
                                rowMap.putDouble(columnName, cursor.getDouble(i))
                            }
                            android.database.Cursor.FIELD_TYPE_STRING -> {
                                rowMap.putString(columnName, cursor.getString(i))
                            }
                            android.database.Cursor.FIELD_TYPE_NULL -> {
                                rowMap.putNull(columnName)
                            }
                            else -> {
                                rowMap.putString(columnName, cursor.getString(i))
                            }
                        }
                    }
                    resultArray.pushMap(rowMap)
                } while (cursor.moveToNext())
            }
            
            cursor.close()
            db.close()
            promise.resolve(resultArray)
        } catch (e: Exception) {
            promise.reject("DATABASE_ERROR", "Error reading collected questions: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getExamQuestionsBySubject(subjectId: Int, promise: Promise) {
        try {
            Log.d("StudentDB", "========== getExamQuestionsBySubject 开始 ==========")
            Log.d("StudentDB", "请求的 subjectId: $subjectId")
            
            val dbFile = copyDatabaseFromAssets(false)
            Log.d("StudentDB", "数据库文件路径: ${dbFile.absolutePath}")
            Log.d("StudentDB", "数据库文件是否存在: ${dbFile.exists()}")
            
            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
            
            // 检查表是否存在
            val tableCheckCursor = db.rawQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='exam_question'", null)
            val tableExists = tableCheckCursor.count > 0
            tableCheckCursor.close()
            Log.d("StudentDB", "exam_question 表是否存在: $tableExists")
            
            // 查询表中所有记录的总数
            val allCountCursor = db.rawQuery("SELECT COUNT(*) FROM exam_question", null)
            var allCount = 0
            if (allCountCursor.moveToFirst()) {
                allCount = allCountCursor.getInt(0)
            }
            allCountCursor.close()
            Log.d("StudentDB", "exam_question 表中总记录数: $allCount")
            
            // 查询所有不同的 subjectid
            val subjectIdsCursor = db.rawQuery("SELECT DISTINCT subjectid FROM exam_question", null)
            val subjectIdsList = mutableListOf<Int>()
            if (subjectIdsCursor.moveToFirst()) {
                do {
                    subjectIdsList.add(subjectIdsCursor.getInt(0))
                } while (subjectIdsCursor.moveToNext())
            }
            subjectIdsCursor.close()
            Log.d("StudentDB", "exam_question 表中所有的 subjectid: ${subjectIdsList.joinToString(", ")}")
            
            // 先查询指定 subjectid 的总数
            val countCursor = db.rawQuery("SELECT COUNT(*) FROM exam_question WHERE subjectid = ?", arrayOf(subjectId.toString()))
            var totalCount = 0
            if (countCursor.moveToFirst()) {
                totalCount = countCursor.getInt(0)
            }
            countCursor.close()
            Log.d("StudentDB", "exam_question 表中 subjectid=$subjectId 的记录数: $totalCount")
            
            // 查询所有记录
            val cursor = db.rawQuery("SELECT * FROM exam_question WHERE subjectid = ?", arrayOf(subjectId.toString()))
            val resultArray = WritableNativeArray()
            
            Log.d("StudentDB", "查询结果游标数量: ${cursor.count}")
            
            if (cursor.moveToFirst()) {
                val columnCount = cursor.columnCount
                Log.d("StudentDB", "列数: $columnCount")
                
                // 打印列名
                val columnNames = mutableListOf<String>()
                for (i in 0 until columnCount) {
                    columnNames.add(cursor.getColumnName(i))
                }
                Log.d("StudentDB", "列名: ${columnNames.joinToString(", ")}")
                
                var rowIndex = 0
                do {
                    val rowMap = WritableNativeMap()
                    Log.d("StudentDB", "--- 第 ${rowIndex + 1} 条记录 ---")
                    
                    for (i in 0 until columnCount) {
                        val columnName = cursor.getColumnName(i)
                        when (cursor.getType(i)) {
                            android.database.Cursor.FIELD_TYPE_INTEGER -> {
                                val value = cursor.getInt(i)
                                rowMap.putInt(columnName, value)
                                Log.d("StudentDB", "  $columnName (INT): $value")
                            }
                            android.database.Cursor.FIELD_TYPE_FLOAT -> {
                                val value = cursor.getDouble(i)
                                rowMap.putDouble(columnName, value)
                                Log.d("StudentDB", "  $columnName (FLOAT): $value")
                            }
                            android.database.Cursor.FIELD_TYPE_STRING -> {
                                val value = cursor.getString(i)
                                rowMap.putString(columnName, value)
                                // 对于长文本只打印前100个字符
                                val displayValue = if (value.length > 100) "${value.substring(0, 100)}..." else value
                                Log.d("StudentDB", "  $columnName (STRING): $displayValue")
                            }
                            android.database.Cursor.FIELD_TYPE_NULL -> {
                                rowMap.putNull(columnName)
                                Log.d("StudentDB", "  $columnName: NULL")
                            }
                            else -> {
                                val value = cursor.getString(i)
                                rowMap.putString(columnName, value)
                                Log.d("StudentDB", "  $columnName (OTHER): $value")
                            }
                        }
                    }
                    resultArray.pushMap(rowMap)
                    rowIndex++
                } while (cursor.moveToNext())
                
                Log.d("StudentDB", "成功读取 $rowIndex 条记录")
            } else {
                Log.w("StudentDB", "警告: 没有找到任何记录！")
            }
            
            cursor.close()
            db.close()
            
            Log.d("StudentDB", "返回数组大小: ${resultArray.size()}")
            Log.d("StudentDB", "========== getExamQuestionsBySubject 结束 ==========")
            
            promise.resolve(resultArray)
        } catch (e: Exception) {
            Log.e("StudentDB", "错误: ${e.message}", e)
            promise.reject("DATABASE_ERROR", "Error reading exam questions: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getExamItemsByQuestionId(questionId: Int, promise: Promise) {
        try {
            Log.d("StudentDB", "========== getExamItemsByQuestionId 开始 ==========")
            Log.d("StudentDB", "请求的 questionId: $questionId")
            
            val dbFile = copyDatabaseFromAssets(false)
            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
            
            // 先查询总数
            val countCursor = db.rawQuery("SELECT COUNT(*) FROM exam_items WHERE qid = ?", arrayOf(questionId.toString()))
            var totalCount = 0
            if (countCursor.moveToFirst()) {
                totalCount = countCursor.getInt(0)
            }
            countCursor.close()
            Log.d("StudentDB", "exam_items 表中 qid=$questionId 的记录数: $totalCount")
            
            val cursor = db.rawQuery("SELECT * FROM exam_items WHERE qid = ?", arrayOf(questionId.toString()))
            val resultArray = WritableNativeArray()
            
            Log.d("StudentDB", "查询结果游标数量: ${cursor.count}")
            
            if (cursor.moveToFirst()) {
                val columnCount = cursor.columnCount
                var rowIndex = 0
                do {
                    val rowMap = WritableNativeMap()
                    Log.d("StudentDB", "--- exam_items 第 ${rowIndex + 1} 条记录 ---")
                    
                    for (i in 0 until columnCount) {
                        val columnName = cursor.getColumnName(i)
                        when (cursor.getType(i)) {
                            android.database.Cursor.FIELD_TYPE_INTEGER -> {
                                val value = cursor.getInt(i)
                                rowMap.putInt(columnName, value)
                                Log.d("StudentDB", "  $columnName: $value")
                            }
                            android.database.Cursor.FIELD_TYPE_FLOAT -> {
                                val value = cursor.getDouble(i)
                                rowMap.putDouble(columnName, value)
                                Log.d("StudentDB", "  $columnName: $value")
                            }
                            android.database.Cursor.FIELD_TYPE_STRING -> {
                                val value = cursor.getString(i)
                                rowMap.putString(columnName, value)
                                val displayValue = if (value.length > 100) "${value.substring(0, 100)}..." else value
                                Log.d("StudentDB", "  $columnName: $displayValue")
                            }
                            android.database.Cursor.FIELD_TYPE_NULL -> {
                                rowMap.putNull(columnName)
                                Log.d("StudentDB", "  $columnName: NULL")
                            }
                            else -> {
                                val value = cursor.getString(i)
                                rowMap.putString(columnName, value)
                                Log.d("StudentDB", "  $columnName: $value")
                            }
                        }
                    }
                    resultArray.pushMap(rowMap)
                    rowIndex++
                } while (cursor.moveToNext())
                
                Log.d("StudentDB", "成功读取 $rowIndex 条 exam_items 记录")
            } else {
                Log.w("StudentDB", "警告: 没有找到任何 exam_items 记录！")
            }
            
            cursor.close()
            db.close()
            
            Log.d("StudentDB", "返回数组大小: ${resultArray.size()}")
            Log.d("StudentDB", "========== getExamItemsByQuestionId 结束 ==========")
            
            promise.resolve(resultArray)
        } catch (e: Exception) {
            Log.e("StudentDB", "错误: ${e.message}", e)
            promise.reject("DATABASE_ERROR", "Error reading exam items: ${e.message}", e)
        }
    }

}

