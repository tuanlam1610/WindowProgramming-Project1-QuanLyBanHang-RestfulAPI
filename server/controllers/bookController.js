const model = require('../model/model')
const mongoose = require('mongoose')

const bookController = {
    addBook: async (req, res) => {
        try {
            let msg;
            if (req.body.category_Name) {
                const category = await model.Category.findOne({ name: req.body.category_Name });
                if (!(await category)) {
                    res.status(400).json({
                        msg: "Thể loại này không tồn tại"
                    });
                }
                else {
                    req.body.category = category._id;
                    const newBook = new model.Book(req.body);
                    const savedBook = await newBook.save();
                    await category.updateOne({ $push: { listOfBook: savedBook._id } });
                    res.status(200).json({
                        msg: "Thêm sách thành công!",
                        book: savedBook
                    });
                }
            }
        } catch (err) {
            res.status(500).json(err);
        }
    },
    getABook: async (req, res) => {
        try {
            const bookSearch = await model.Book.findById(req.params.id).populate({ path: "category", select: "name" });;
            if (bookSearch)
                res.status(200).json({
                    book: bookSearch
                });
            else {
                res.status(400).json({
                    msg: "Không tìm thấy sách này!"
                })
            }
        } catch (err) {
            res.status(500).json(err);
        }
    },
    updateBook: async (req, res) => {
        try {
            const bookToUpdate = await model.Book.findById(req.params.id);
            if (req.body.category) {
                await model.Category.findByIdAndUpdate(bookToUpdate.category, { $pull: { listOfBook: bookToUpdate._id } })
                await model.Category.findByIdAndUpdate(req.body.category, { $push: { listOfBook: bookToUpdate._id } })
            }
            const updatedBook = await model.Book.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
            res.status(200).json({
                msg: "Cập nhật sách thành công",
                updatedBook: updatedBook
            })
        } catch (err) {
            res.status(500).json({ success: false, msg: err.message });
        }
    },
    deleteBook: async (req, res) => {
        try {
            const bookToDelete = await model.Book.findById(req.params.id);
            await model.Category.findByIdAndUpdate(bookToDelete.category, { $pull: { listOfBook: bookToDelete._id } })
            await model.Book.findByIdAndDelete(req.params.id)
            res.status(200).json("Xóa thành công.")
        } catch (err) {
            res.status(500).json({ success: false, msg: err.message });
        }
    },
    searchBook: async (req, res) => {
        try {
            const page = req.query.page || 1;
            const itemPerPage = req.query.itemPerPage || 10;
            const nameToSearch = req.query.name || "";
            const minPrice = req.query.minPrice || 0;
            const maxPrice = req.query.maxPrice || 100000000;
            const numOfBooks = await model.Book.count()
                .where({
                    name: { $regex: nameToSearch }
                }).where({
                    price: {
                        $lte: maxPrice,
                        $gte: minPrice
                    }
                });
            console.log(numOfBooks)
            const numOfPage = Math.ceil(numOfBooks / itemPerPage)
            console.log(numOfPage)
            const listOfBook = await model.Book.find()
                .where({
                    name: { $regex: nameToSearch }
                }).where({
                    price: {
                        $lte: maxPrice,
                        $gte: minPrice
                    }
                })
                .sort({ name: 1 })
                .skip((page - 1) * itemPerPage)
                .limit(itemPerPage);
            res.status(200).json({
                listOfBook: listOfBook,
                numOfBooks: numOfBooks,
                numOfPage: numOfPage
            });
        } catch (err) {
            res.status(500).json({ success: false, msg: err.message });
        }
    },
    // saleReport: async (req, res) => {
    //     try {
    //         const modeReport = req.query.mode;
    //         const start = new Date(req.query.minDate);
    //         const end = req.query.maxDate ? new Date(req.query.maxDate) : Date(Date.now());

    //         const filter = {
    //             date: { $gte: start, $lte: end },
    //         };

    //         let aggregateQuery = [
    //             {
    //                 $match: filter
    //             },
    //             {
    //                 $unwind: "$listOfBook"
    //             },
    //             {
    //                 $group: {
    //                     _id: {
    //                         date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
    //                         book: "$listOfBook.book",
    //                     },
    //                     totalQuantity: { $sum: "$listOfBook.quantity" }
    //                 }
    //             },
    //             {
    //                 $lookup: {
    //                     from: "books",
    //                     localField: "listOfBook.book", // sửa trường localField
    //                     foreignField: "_id",
    //                     as: "bookDetails"
    //                 }
    //             },
    //             {
    //                 $sort: {
    //                     totalQuantity: -1
    //                 }
    //             }
    //         ];

    //         if (modeReport === "month") {
    //             aggregateQuery[2].$group._id.date = { $dateToString: { format: "%Y-%m", date: "$date" } };
    //         } else if (modeReport === "year") {
    //             aggregateQuery[2].$group._id.date = { $dateToString: { format: "%Y", date: "$date" } };
    //         } else if (modeReport === "week") {
    //             aggregateQuery[2].$group._id = {
    //                 week: { $isoWeek: "$date" },
    //                 year: { $year: "$date" },
    //                 book: "$listOfBook.book",
    //             };
    //         }

    //         const incomeReport = await model.Order.aggregate(aggregateQuery);
    //         console.log(incomeReport)
    //         res.status(200).json(incomeReport);
    //     } catch (err) {
    //         res.status(500).json({ success: false, msg: err.message });
    //     }
    // }

    saleReport: async (req, res) => {
        try {
            const modeReport = req.query.mode;
            const start = new Date(req.query.minDate);
            const end = req.query.maxDate ? new Date(req.query.maxDate) : Date(Date.now());

            const filter = {
                date: { $gte: start, $lte: end },
            };

            let aggregateQuery = [
                {
                    $match: filter
                },
                {
                    $unwind: "$listOfBook"
                },
                {
                    $lookup: {
                        from: "books",
                        localField: "listOfBook.book",
                        foreignField: "_id",
                        as: "bookDetails",
                        // pipeline: {
                        //     $project: {
                        //         _id: 1,
                        //         name: 2,
                        //     }
                        // }
                    }
                },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                            book: "$bookDetails",
                        },
                        totalQuantity: { $sum: "$listOfBook.quantity" }
                    }
                },
                {
                    $sort: {
                        totalQuantity: -1
                    }
                }
            ];

            if (modeReport === "month") {
                aggregateQuery[2].$group._id.date = { $dateToString: { format: "%Y-%m", date: "$date" } };
            } else if (modeReport === "year") {
                aggregateQuery[2].$group._id.date = { $dateToString: { format: "%Y", date: "$date" } };
            } else if (modeReport === "week") {
                aggregateQuery[2].$group._id = {
                    week: { $isoWeek: "$date" },
                    year: { $year: "$date" },
                    book: "$listOfBook.book",
                };
            }

            const incomeReport = await model.Order.aggregate(aggregateQuery);
            res.status(200).json(incomeReport);
        } catch (err) {
            res.status(500).json({ success: false, msg: err.message });
        }
    }
}

module.exports = bookController;